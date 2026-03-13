import {
  Engine,
  type Camera,
  type Solid,
} from "@webgame/engine";
import {
  createMatrix4,
  multiplyMatrices,
  setPerspectiveMatrix,
  setViewMatrix,
} from "./matrix";

const shaderCode = `
  struct Camera {
    viewProjection: mat4x4f,
  };

  struct SolidState {
    position: vec3f,
    _positionPadding: f32,
    rotation: vec4f,
    scale: vec3f,
    _scalePadding: f32,
    color: vec3f,
    _colorPadding: f32,
  };

  struct VertexInput {
    @location(0) position: vec3f,
  };

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f,
  };

  @group(0) @binding(0) var<uniform> camera: Camera;
  @group(1) @binding(0) var<uniform> solid: SolidState;

  fn rotateQuaternion(position: vec3f, rotation: vec4f) -> vec3f {
    let offset = 2.0 * cross(rotation.xyz, position);
    return position + rotation.w * offset + cross(rotation.xyz, offset);
  }

  @vertex
  fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    var position = input.position * solid.scale;
    position = rotateQuaternion(position, solid.rotation);
    position = position + solid.position;
    output.position = camera.viewProjection * vec4f(position, 1.0);
    output.color = solid.color;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.color, 1.0);
  }
`;

interface SolidGpuResources {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
}

const gpuResourcesComponent = Symbol("gpuResources");

type RenderSolid = Solid & {
  [gpuResourcesComponent]?: SolidGpuResources;
};

export class Renderer {
  readonly engine: Engine;
  #context: GPUCanvasContext;
  #device: GPUDevice;
  #pipeline: GPURenderPipeline;
  #cameraBuffer: GPUBuffer;
  #cameraBindGroup: GPUBindGroup;
  #solidBindGroupLayout: GPUBindGroupLayout;
  #depthTexture: GPUTexture;
  #aspect: number;
  #projectionMatrix: Float32Array<ArrayBuffer>;
  #viewMatrix: Float32Array<ArrayBuffer>;
  #viewProjectionMatrix: Float32Array<ArrayBuffer>;
  #solidState: Float32Array<ArrayBuffer>;

  private constructor(
    context: GPUCanvasContext,
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    cameraBuffer: GPUBuffer,
    cameraBindGroup: GPUBindGroup,
    solidBindGroupLayout: GPUBindGroupLayout,
    depthTexture: GPUTexture,
    aspect: number,
  ) {
    this.#context = context;
    this.#device = device;
    this.#pipeline = pipeline;
    this.#cameraBuffer = cameraBuffer;
    this.#cameraBindGroup = cameraBindGroup;
    this.#solidBindGroupLayout = solidBindGroupLayout;
    this.#depthTexture = depthTexture;
    this.#aspect = aspect;
    this.#projectionMatrix = createMatrix4();
    this.#viewMatrix = createMatrix4();
    this.#viewProjectionMatrix = createMatrix4();
    this.#solidState = new Float32Array(
      new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT),
    );
    this.engine = new Engine();
  }

  static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
    const gpu = navigator.gpu;
    if (!gpu) {
      throw new Error("WebGPU is not supported in this browser.");
    }

    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      throw new Error("Failed to acquire a WebGPU adapter.");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to acquire a WebGPU canvas context.");
    }

    const presentationFormat = gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format: presentationFormat,
      alphaMode: "opaque",
    });

    const shaderModule = device.createShaderModule({ code: shaderCode });
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
        buffers: [
          {
            arrayStride: 12,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: presentationFormat }],
      },
      primitive: {
        topology: "triangle-list",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });

    const cameraBuffer = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const cameraBindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: cameraBuffer },
        },
      ],
    });
    const solidBindGroupLayout = pipeline.getBindGroupLayout(1);
    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    return new Renderer(
      context,
      device,
      pipeline,
      cameraBuffer,
      cameraBindGroup,
      solidBindGroupLayout,
      depthTexture,
      canvas.width / canvas.height,
    );
  }

  destroy(): void {
    for (const solid of this.engine.solids) {
      const resources = (solid as RenderSolid)[gpuResourcesComponent];
      if (!resources) {
        continue;
      }

      resources.vertexBuffer.destroy();
      resources.indexBuffer.destroy();
      resources.uniformBuffer.destroy();
      delete (solid as RenderSolid)[gpuResourcesComponent];
    }

    this.engine.destroy();
    this.#depthTexture.destroy();
    this.#cameraBuffer.destroy();
  }

  #createGpuResources(geometry: Solid["geometry"]): SolidGpuResources {
    const uniformBuffer = this.#device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    return {
      vertexBuffer: this.#createBuffer(
        geometry.vertices,
        GPUBufferUsage.VERTEX,
      ),
      indexBuffer: this.#createBuffer(geometry.indices, GPUBufferUsage.INDEX),
      indexCount: geometry.indices.length,
      uniformBuffer,
      bindGroup: this.#device.createBindGroup({
        layout: this.#solidBindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
        ],
      }),
    };
  }

  render(): void {
    this.#updateCamera(this.engine.camera);

    const commandEncoder = this.#device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.#context.getCurrentTexture().createView(),
          clearValue: { r: 0.03, g: 0.03, b: 0.04, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.#depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    renderPass.setPipeline(this.#pipeline);
    renderPass.setBindGroup(0, this.#cameraBindGroup);

    for (const solid of this.engine.solids) {
      this.#drawSolid(renderPass, solid);
    }

    renderPass.end();
    this.#device.queue.submit([commandEncoder.finish()]);
  }

  #drawSolid(renderPass: GPURenderPassEncoder, solid: Solid): void {
    const resources = this.#getGpuResources(solid as RenderSolid);
    const { position, rotation, scale } = solid.transform;
    const solidState = this.#solidState;

    solidState[0] = position[0];
    solidState[1] = position[1];
    solidState[2] = position[2];
    solidState[3] = 0;
    solidState[4] = rotation[0];
    solidState[5] = rotation[1];
    solidState[6] = rotation[2];
    solidState[7] = rotation[3];
    solidState[8] = scale[0];
    solidState[9] = scale[1];
    solidState[10] = scale[2];
    solidState[11] = 0;
    solidState[12] = solid.color[0];
    solidState[13] = solid.color[1];
    solidState[14] = solid.color[2];
    solidState[15] = 0;

    this.#device.queue.writeBuffer(
      resources.uniformBuffer,
      0,
      solidState,
    );

    renderPass.setBindGroup(1, resources.bindGroup);
    renderPass.setVertexBuffer(0, resources.vertexBuffer);
    renderPass.setIndexBuffer(resources.indexBuffer, "uint16");
    renderPass.drawIndexed(resources.indexCount);
  }

  #getGpuResources(solid: RenderSolid): SolidGpuResources {
    const existingResources = solid[gpuResourcesComponent];
    if (existingResources) {
      return existingResources;
    }

    const resources = this.#createGpuResources(solid.geometry);
    solid[gpuResourcesComponent] = resources;
    return resources;
  }

  #createBuffer(
    data: Float32Array | Uint16Array,
    usage: GPUBufferUsageFlags,
  ): GPUBuffer {
    const buffer = this.#device.createBuffer({
      size: data.byteLength,
      usage,
      mappedAtCreation: true,
    });

    new Uint8Array(buffer.getMappedRange()).set(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );

    buffer.unmap();

    return buffer;
  }

  #updateCamera(camera: Camera): void {
    setPerspectiveMatrix(
      this.#projectionMatrix,
      camera.fovY,
      this.#aspect,
      camera.near,
      camera.far,
    );
    setViewMatrix(this.#viewMatrix, camera.position, camera.rotation);
    multiplyMatrices(
      this.#viewProjectionMatrix,
      this.#projectionMatrix,
      this.#viewMatrix,
    );

    this.#device.queue.writeBuffer(
      this.#cameraBuffer,
      0,
      this.#viewProjectionMatrix,
    );
  }
}

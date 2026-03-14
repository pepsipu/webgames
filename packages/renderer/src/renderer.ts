import {
  createTransform,
  Engine,
  getWorldTransform,
  type Camera,
  type Geometry,
  type GeometryNode,
  type MaterialNode,
  type Transform,
  type TransformNode,
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

  struct DrawState {
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
  @group(1) @binding(0) var<uniform> drawState: DrawState;

  fn rotateQuaternion(position: vec3f, rotation: vec4f) -> vec3f {
    let offset = 2.0 * cross(rotation.xyz, position);
    return position + rotation.w * offset + cross(rotation.xyz, offset);
  }

  @vertex
  fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    var position = input.position * drawState.scale;
    position = rotateQuaternion(position, drawState.rotation);
    position = position + drawState.position;
    output.position = camera.viewProjection * vec4f(position, 1.0);
    output.color = drawState.color;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.color, 1.0);
  }
`;

interface NodeGpuResources {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
}

const gpuResourcesComponent = Symbol("gpuResources");

type RenderableNode = TransformNode & GeometryNode & MaterialNode & {
  [gpuResourcesComponent]?: NodeGpuResources;
};

function isRenderable(node: TransformNode): node is RenderableNode {
  return "geometry" in node && "material" in node;
}

export class Renderer {
  readonly engine: Engine;
  #context: GPUCanvasContext;
  #device: GPUDevice;
  #pipeline: GPURenderPipeline;
  #cameraBuffer: GPUBuffer;
  #cameraBindGroup: GPUBindGroup;
  #nodeBindGroupLayout: GPUBindGroupLayout;
  #depthTexture: GPUTexture;
  #aspect: number;
  #projectionMatrix: Float32Array<ArrayBuffer>;
  #viewMatrix: Float32Array<ArrayBuffer>;
  #viewProjectionMatrix: Float32Array<ArrayBuffer>;
  #drawState: Float32Array<ArrayBuffer>;
  #worldTransform: Transform;

  private constructor(
    context: GPUCanvasContext,
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    cameraBuffer: GPUBuffer,
    cameraBindGroup: GPUBindGroup,
    nodeBindGroupLayout: GPUBindGroupLayout,
    depthTexture: GPUTexture,
    aspect: number,
  ) {
    this.#context = context;
    this.#device = device;
    this.#pipeline = pipeline;
    this.#cameraBuffer = cameraBuffer;
    this.#cameraBindGroup = cameraBindGroup;
    this.#nodeBindGroupLayout = nodeBindGroupLayout;
    this.#depthTexture = depthTexture;
    this.#aspect = aspect;
    this.#projectionMatrix = createMatrix4();
    this.#viewMatrix = createMatrix4();
    this.#viewProjectionMatrix = createMatrix4();
    this.#drawState = new Float32Array(
      new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT),
    );
    this.#worldTransform = createTransform();
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
    const nodeBindGroupLayout = pipeline.getBindGroupLayout(1);
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
      nodeBindGroupLayout,
      depthTexture,
      canvas.width / canvas.height,
    );
  }

  destroy(): void {
    this.#destroyNode(this.engine.scene);
    this.engine.destroy();
    this.#depthTexture.destroy();
    this.#cameraBuffer.destroy();
  }

  #createGpuResources(geometry: Geometry): NodeGpuResources {
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
        layout: this.#nodeBindGroupLayout,
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
    this.#drawNode(renderPass, this.engine.scene);

    renderPass.end();
    this.#device.queue.submit([commandEncoder.finish()]);
  }

  #drawNode(
    renderPass: GPURenderPassEncoder,
    node: TransformNode,
  ): void {
    if (isRenderable(node)) {
      this.#drawRenderNode(renderPass, node);
    }

    for (const child of node.children) {
      this.#drawNode(renderPass, child);
    }
  }

  #drawRenderNode(
    renderPass: GPURenderPassEncoder,
    node: RenderableNode,
  ): void {
    const resources = this.#getGpuResources(node);
    getWorldTransform(this.#worldTransform, node);
    const { position, rotation, scale } = this.#worldTransform;
    const drawState = this.#drawState;

    drawState[0] = position[0];
    drawState[1] = position[1];
    drawState[2] = position[2];
    drawState[3] = 0;
    drawState[4] = rotation[0];
    drawState[5] = rotation[1];
    drawState[6] = rotation[2];
    drawState[7] = rotation[3];
    drawState[8] = scale[0];
    drawState[9] = scale[1];
    drawState[10] = scale[2];
    drawState[11] = 0;
    drawState[12] = node.material[0];
    drawState[13] = node.material[1];
    drawState[14] = node.material[2];
    drawState[15] = 0;

    this.#device.queue.writeBuffer(
      resources.uniformBuffer,
      0,
      drawState,
    );

    renderPass.setBindGroup(1, resources.bindGroup);
    renderPass.setVertexBuffer(0, resources.vertexBuffer);
    renderPass.setIndexBuffer(resources.indexBuffer, "uint16");
    renderPass.drawIndexed(resources.indexCount);
  }

  #destroyNode(node: TransformNode): void {
    if (isRenderable(node)) {
      const resources = node[gpuResourcesComponent];

      if (resources) {
        resources.vertexBuffer.destroy();
        resources.indexBuffer.destroy();
        resources.uniformBuffer.destroy();
        delete node[gpuResourcesComponent];
      }
    }

    for (const child of node.children) {
      this.#destroyNode(child);
    }
  }

  #getGpuResources(node: RenderableNode): NodeGpuResources {
    const existingResources = node[gpuResourcesComponent];
    if (existingResources) {
      return existingResources;
    }

    const resources = this.#createGpuResources(node.geometry);
    node[gpuResourcesComponent] = resources;
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

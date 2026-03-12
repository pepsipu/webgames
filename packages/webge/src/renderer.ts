import type { SolidGeometry } from "./geometry";
import type { Solid, SolidGpuResources } from "./solids";

const shaderCode = `
  struct Camera {
    aspect: f32,
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

  fn rotateY(position: vec3f, angle: f32) -> vec3f {
    let sine = sin(angle);
    let cosine = cos(angle);
    return vec3f(
      position.x * cosine - position.z * sine,
      position.y,
      position.x * sine + position.z * cosine,
    );
  }

  fn rotateX(position: vec3f, angle: f32) -> vec3f {
    let sine = sin(angle);
    let cosine = cos(angle);
    return vec3f(
      position.x,
      position.y * cosine - position.z * sine,
      position.y * sine + position.z * cosine,
    );
  }

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
    position = rotateY(position, 0.7);
    position = rotateX(position, -0.45);

    let depth = 5.0 - position.z;
    let scale = 1.6 / depth;

    output.position = vec4f(
      (position.x * scale) / camera.aspect,
      position.y * scale,
      0.0,
      1.0,
    );
    output.color = solid.color;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.color, 1.0);
  }
`;

export class Renderer {
  #context: GPUCanvasContext;
  #device: GPUDevice;
  #pipeline: GPURenderPipeline;
  #cameraBuffer: GPUBuffer;
  #cameraBindGroup: GPUBindGroup;
  #solidBindGroupLayout: GPUBindGroupLayout;

  private constructor(
    context: GPUCanvasContext,
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    cameraBuffer: GPUBuffer,
    cameraBindGroup: GPUBindGroup,
    solidBindGroupLayout: GPUBindGroupLayout,
  ) {
    this.#context = context;
    this.#device = device;
    this.#pipeline = pipeline;
    this.#cameraBuffer = cameraBuffer;
    this.#cameraBindGroup = cameraBindGroup;
    this.#solidBindGroupLayout = solidBindGroupLayout;
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

    const canvasRect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(canvasRect.width * pixelRatio);
    canvas.height = Math.floor(canvasRect.height * pixelRatio);

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
    });

    const cameraBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(
      cameraBuffer,
      0,
      new Float32Array([canvas.width / canvas.height]),
    );

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

    return new Renderer(
      context,
      device,
      pipeline,
      cameraBuffer,
      cameraBindGroup,
      solidBindGroupLayout,
    );
  }

  destroy(): void {
    this.#cameraBuffer.destroy();
  }

  createGpuResources(geometry: SolidGeometry): SolidGpuResources {
    const uniformBuffer = this.#device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    return {
      vertexBuffer: this.#createBuffer(geometry.vertices, GPUBufferUsage.VERTEX),
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

  render(solids: readonly Solid[]): void {
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
    });

    renderPass.setPipeline(this.#pipeline);
    renderPass.setBindGroup(0, this.#cameraBindGroup);

    for (const solid of solids) {
      this.#drawSolid(renderPass, solid);
    }

    renderPass.end();
    this.#device.queue.submit([commandEncoder.finish()]);
  }

  #drawSolid(renderPass: GPURenderPassEncoder, solid: Solid): void {
    const { position, rotation, scale } = solid.transform;

    this.#device.queue.writeBuffer(
      solid.resources.uniformBuffer,
      0,
      new Float32Array([
        position[0],
        position[1],
        position[2],
        0,
        rotation[0],
        rotation[1],
        rotation[2],
        rotation[3],
        scale[0],
        scale[1],
        scale[2],
        0,
        solid.color[0],
        solid.color[1],
        solid.color[2],
        0,
      ]),
    );

    renderPass.setBindGroup(1, solid.resources.bindGroup);
    renderPass.setVertexBuffer(0, solid.resources.vertexBuffer);
    renderPass.setIndexBuffer(solid.resources.indexBuffer, "uint16");
    renderPass.drawIndexed(solid.resources.indexCount);
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
}

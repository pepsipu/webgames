import type { Solid } from "./solids";

const shaderCode = `
  struct Camera {
    aspect: f32,
  };

  struct VertexInput {
    @location(0) position: vec3f,
    @location(1) color: vec3f,
  };

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f,
  };

  @group(0) @binding(0) var<uniform> camera: Camera;

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

  @vertex
  fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    var position = rotateY(input.position, 0.7);
    position = rotateX(position, -0.45);

    let depth = 5.0 - position.z;
    let scale = 1.6 / depth;

    output.position = vec4f(
      (position.x * scale) / camera.aspect,
      position.y * scale,
      0.0,
      1.0,
    );
    output.color = input.color;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.color, 1.0);
  }
`;

export class Renderer {
  readonly device: GPUDevice;

  #context: GPUCanvasContext;
  #pipeline: GPURenderPipeline;
  #cameraBuffer: GPUBuffer;
  #cameraBindGroup: GPUBindGroup;

  private constructor(
    context: GPUCanvasContext,
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    cameraBuffer: GPUBuffer,
    cameraBindGroup: GPUBindGroup,
  ) {
    this.#context = context;
    this.device = device;
    this.#pipeline = pipeline;
    this.#cameraBuffer = cameraBuffer;
    this.#cameraBindGroup = cameraBindGroup;
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
            arrayStride: 24,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
              {
                shaderLocation: 1,
                offset: 12,
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

    return new Renderer(
      context,
      device,
      pipeline,
      cameraBuffer,
      cameraBindGroup,
    );
  }

  destroy(): void {
    this.#cameraBuffer.destroy();
  }

  render(solids: readonly Solid[]): void {
    const commandEncoder = this.device.createCommandEncoder();
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
    this.device.queue.submit([commandEncoder.finish()]);
  }

  #drawSolid(renderPass: GPURenderPassEncoder, solid: Solid): void {
    renderPass.setVertexBuffer(0, solid.resources.vertexBuffer);
    renderPass.setIndexBuffer(solid.resources.indexBuffer, "uint16");
    renderPass.drawIndexed(solid.resources.indexCount);
  }
}

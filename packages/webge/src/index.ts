export class Renderer {
  #canvas: HTMLCanvasElement;
  #context: GPUCanvasContext;
  #device: GPUDevice;
  #pipeline: GPURenderPipeline;
  #presentationFormat: GPUTextureFormat;
  #resizeObserver: ResizeObserver;

  private constructor(
    canvas: HTMLCanvasElement,
    context: GPUCanvasContext,
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    presentationFormat: GPUTextureFormat,
  ) {
    this.#canvas = canvas;
    this.#context = context;
    this.#device = device;
    this.#pipeline = pipeline;
    this.#presentationFormat = presentationFormat;

    this.#resizeObserver = new ResizeObserver(([entry]) => {
      const pixelBox = entry.devicePixelContentBoxSize?.[0];
      const cssBox = entry.contentBoxSize[0];
      const dpr = window.devicePixelRatio || 1;
      const max = this.#device.limits.maxTextureDimension2D;

      this.#canvas.width = Math.max(
        1,
        Math.min(
          pixelBox?.inlineSize ?? Math.round(cssBox.inlineSize * dpr),
          max,
        ),
      );

      this.#canvas.height = Math.max(
        1,
        Math.min(
          pixelBox?.blockSize ?? Math.round(cssBox.blockSize * dpr),
          max,
        ),
      );
    });
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

    const shaderModule = device.createShaderModule({
      code: `
        @vertex
        fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
          var positions = array<vec2f, 3>(
            vec2f(0.0, 0.6),
            vec2f(-0.6, -0.6),
            vec2f(0.6, -0.6),
          );
          return vec4f(positions[vertexIndex], 0.0, 1.0);
        }

        @fragment
        fn fragmentMain() -> @location(0) vec4f {
          return vec4f(0.95, 0.35, 0.2, 1.0);
        }
      `,
    });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
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

    const renderer = new Renderer(
      canvas,
      context,
      device,
      pipeline,
      presentationFormat,
    );

    renderer.#resizeObserver.observe(canvas);

    return renderer;
  }

  destroy(): void {
    this.#resizeObserver.disconnect();
  }

  render(): void {
    const commandEncoder = this.#device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.#context.getCurrentTexture().createView(),
          clearValue: { r: 0.08, g: 0.09, b: 0.12, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.#pipeline);
    renderPass.draw(3);
    renderPass.end();

    this.#device.queue.submit([commandEncoder.finish()]);
  }
}

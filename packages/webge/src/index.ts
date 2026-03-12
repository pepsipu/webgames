export type WebGpuTriangleRenderer = {
  render: () => void;
};

export async function createTriangleRenderer(
  canvas: HTMLCanvasElement,
): Promise<WebGpuTriangleRenderer> {
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

  const configureContext = () => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(
      1,
      Math.floor(canvas.clientWidth * devicePixelRatio),
    );
    const height = Math.max(
      1,
      Math.floor(canvas.clientHeight * devicePixelRatio),
    );

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    context.configure({
      alphaMode: "opaque",
      device,
      format: presentationFormat,
    });
  };

  const shaderModule = device.createShaderModule({
    code: `
      @vertex
      fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
        var positions = array<vec2f, 3>(
          vec2f(0.0, 0.6),
          vec2f(-0.6, -0.6),
          vec2f(0.6, -0.6),
        );

        let position = positions[vertexIndex];
        return vec4f(position, 0.0, 1.0);
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
      entryPoint: "vertexMain",
      module: shaderModule,
    },
    fragment: {
      entryPoint: "fragmentMain",
      module: shaderModule,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const render = () => {
    configureContext();

    const commandEncoder = device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          clearValue: { r: 0.08, g: 0.09, b: 0.12, a: 1 },
          loadOp: "clear",
          storeOp: "store",
          view: context.getCurrentTexture().createView(),
        },
      ],
    });

    renderPass.setPipeline(pipeline);
    renderPass.draw(3);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
  };

  return { render };
}

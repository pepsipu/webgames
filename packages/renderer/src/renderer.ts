import {
  createTransform,
  getWorldTransform,
  type CameraComponent,
  type Engine,
  type Node,
  type Transform,
} from "@webgame/engine";
import { createDrawState, type DrawState, setDrawState } from "./draw-state";
import {
  createNodeGpuResources,
  destroyNodeGpuResources,
  type NodeGpuResources,
} from "./gpu-resources";
import {
  createMatrix4,
  multiplyMatrices,
  setPerspectiveMatrix,
  setViewMatrix,
  type Matrix4,
} from "./matrix";
import {
  gpuResourcesComponent,
  isRenderable,
  type RenderableComponent,
} from "./renderable-component";
import { shaderCode } from "./shader";

export class Renderer {
  #engine: Engine;
  #context: GPUCanvasContext;
  #device: GPUDevice;
  #pipeline: GPURenderPipeline;
  #cameraBuffer: GPUBuffer;
  #cameraBindGroup: GPUBindGroup;
  #nodeBindGroupLayout: GPUBindGroupLayout;
  #depthTexture: GPUTexture;
  #aspect: number;
  #projectionMatrix: Matrix4;
  #viewMatrix: Matrix4;
  #viewProjectionMatrix: Matrix4;
  #drawState: DrawState;
  #cameraTransform: Transform;
  #worldTransform: Transform;

  private constructor(
    engine: Engine,
    context: GPUCanvasContext,
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    cameraBuffer: GPUBuffer,
    cameraBindGroup: GPUBindGroup,
    nodeBindGroupLayout: GPUBindGroupLayout,
    depthTexture: GPUTexture,
    aspect: number,
  ) {
    this.#engine = engine;
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
    this.#drawState = createDrawState();
    this.#cameraTransform = createTransform();
    this.#worldTransform = createTransform();
  }

  static async create(
    engine: Engine,
    canvas: HTMLCanvasElement,
  ): Promise<Renderer> {
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
      size: 16 * Float32Array.BYTES_PER_ELEMENT,
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
      engine,
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
    this.#destroyNode(this.#engine.scene);
    this.#depthTexture.destroy();
    this.#cameraBuffer.destroy();
  }

  render(): void {
    this.#updateCamera(this.#engine.camera);

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
    this.#drawNode(renderPass, this.#engine.scene);

    renderPass.end();
    this.#device.queue.submit([commandEncoder.finish()]);
  }

  // TODO: at some point, we can query renderable components quicker with ECS-like indexing
  #drawNode(renderPass: GPURenderPassEncoder, node: Node): void {
    if (isRenderable(node)) {
      this.#drawRenderNode(renderPass, node);
    }

    for (const child of node.children) {
      this.#drawNode(renderPass, child);
    }
  }

  #drawRenderNode(
    renderPass: GPURenderPassEncoder,
    node: RenderableComponent,
  ): void {
    const resources = this.#getGpuResources(node);
    getWorldTransform(this.#worldTransform, node);
    const drawState = this.#drawState;
    setDrawState(drawState, this.#worldTransform, node.material);

    this.#device.queue.writeBuffer(resources.uniformBuffer, 0, drawState);

    renderPass.setBindGroup(1, resources.bindGroup);
    renderPass.setVertexBuffer(0, resources.vertexBuffer);
    renderPass.setIndexBuffer(resources.indexBuffer, "uint16");
    renderPass.drawIndexed(resources.indexCount);
  }

  #destroyNode(node: Node): void {
    if (isRenderable(node)) {
      const resources = node[gpuResourcesComponent];

      if (resources) {
        destroyNodeGpuResources(resources);
        delete node[gpuResourcesComponent];
      }
    }

    for (const child of node.children) {
      this.#destroyNode(child);
    }
  }

  #getGpuResources(node: RenderableComponent): NodeGpuResources {
    const existingResources = node[gpuResourcesComponent];
    if (existingResources) {
      return existingResources;
    }

    const resources = createNodeGpuResources(
      this.#device,
      this.#nodeBindGroupLayout,
      node.geometry,
    );
    node[gpuResourcesComponent] = resources;
    return resources;
  }

  #updateCamera(camera: CameraComponent): void {
    getWorldTransform(this.#cameraTransform, camera);
    setPerspectiveMatrix(
      this.#projectionMatrix,
      camera.fovY,
      this.#aspect,
      camera.near,
      camera.far,
    );
    setViewMatrix(
      this.#viewMatrix,
      this.#cameraTransform.position,
      this.#cameraTransform.rotation,
    );
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

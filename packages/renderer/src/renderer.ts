import {
  type Engine,
  type Element,
} from "@webgame/engine";
import {
  type CameraElement,
  Transform,
  hasCamera,
} from "@webgame/game";
import { createDrawState, type DrawState, setDrawState } from "./draw-state";
import {
  createElementGpuResources,
  destroyElementGpuResources,
  type ElementGpuResources,
} from "./gpu-resources";
import {
  createMatrix4,
  multiplyMatrices,
  setPerspectiveMatrix,
  setViewMatrix,
  type Matrix4,
} from "./matrix";
import {
  isRenderable,
  type RenderableElement,
} from "./renderable-component";
import { shaderCode } from "./shader";

interface CachedGpuResources {
  readonly indexCount: number;
  readonly indexBuffer: GPUBuffer;
  readonly uniformBuffer: GPUBuffer;
  readonly vertexBuffer: GPUBuffer;
  readonly bindGroup: GPUBindGroup;
  readonly vertices: number[];
  readonly indices: number[];
}

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
  #elementResources: Map<Element, CachedGpuResources>;

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
    this.#cameraTransform = Transform.create();
    this.#worldTransform = Transform.create();
    this.#elementResources = new Map();
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
    this.#destroyGpuResources();
    this.#depthTexture.destroy();
    this.#cameraBuffer.destroy();
  }

  render(): void {
    const camera = this.#findCamera(this.#engine.document);
    if (camera === null) {
      return;
    }

    this.#updateCamera(camera);
    const liveElements = new Set<Element>();

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
    this.#drawElementTree(renderPass, this.#engine.document, liveElements);

    renderPass.end();
    this.#device.queue.submit([commandEncoder.finish()]);
    this.#destroyUnusedResources(liveElements);
  }

  // TODO: at some point, we can query renderable elements quicker with ECS-like indexing
  #drawElementTree(
    renderPass: GPURenderPassEncoder,
    parent: Element,
    liveElements: Set<Element>,
  ): void {
    for (const child of parent.children) {
      if (isRenderable(child)) {
        liveElements.add(child);
        this.#drawRenderableElement(renderPass, child);
      }

      this.#drawElementTree(renderPass, child, liveElements);
    }
  }

  #drawRenderableElement(
    renderPass: GPURenderPassEncoder,
    element: RenderableElement,
  ): void {
    const resources = this.#getGpuResources(element);
    Transform.getWorld(this.#worldTransform, element);
    const drawState = this.#drawState;
    setDrawState(drawState, this.#worldTransform, element.material);

    this.#device.queue.writeBuffer(resources.uniformBuffer, 0, drawState);

    renderPass.setBindGroup(1, resources.bindGroup);
    renderPass.setVertexBuffer(0, resources.vertexBuffer);
    renderPass.setIndexBuffer(resources.indexBuffer, "uint16");
    renderPass.drawIndexed(resources.indexCount);
  }

  #destroyGpuResources(): void {
    for (const resources of this.#elementResources.values()) {
      destroyElementGpuResources(resources);
    }

    this.#elementResources.clear();
  }

  #destroyUnusedResources(liveElements: Set<Element>): void {
    for (const [element, resources] of this.#elementResources) {
      if (liveElements.has(element)) {
        continue;
      }

      destroyElementGpuResources(resources);
      this.#elementResources.delete(element);
    }
  }

  #getGpuResources(element: RenderableElement): CachedGpuResources {
    const existingResources = this.#elementResources.get(element);
    if (
      existingResources !== undefined &&
      isSameArray(existingResources.vertices, element.mesh.vertices) &&
      isSameArray(existingResources.indices, element.mesh.indices)
    ) {
      return existingResources;
    }

    if (existingResources !== undefined) {
      destroyElementGpuResources(existingResources);
    }

    const resources = createElementGpuResources(
      this.#device,
      this.#nodeBindGroupLayout,
      element.mesh,
    );
    const cachedResources = {
      ...resources,
      vertices: element.mesh.vertices.slice(),
      indices: element.mesh.indices.slice(),
    };

    this.#elementResources.set(element, cachedResources);
    return cachedResources;
  }

  #findCamera(parent: Element): CameraElement | null {
    for (const child of parent.children) {
      if (hasCamera(child)) {
        return child;
      }

      const camera = this.#findCamera(child);
      if (camera !== null) {
        return camera;
      }
    }

    return null;
  }

  #updateCamera(camera: CameraElement): void {
    Transform.getWorld(this.#cameraTransform, camera);
    setPerspectiveMatrix(
      this.#projectionMatrix,
      camera.camera.fovY,
      this.#aspect,
      camera.camera.near,
      camera.camera.far,
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

function isSameArray(source: number[], target: number[]): boolean {
  if (source.length !== target.length) {
    return false;
  }

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== target[index]) {
      return false;
    }
  }

  return true;
}

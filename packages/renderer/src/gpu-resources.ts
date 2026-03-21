import type { Mesh } from "@webgame/game";

export interface ElementGpuResources {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
}

export function createElementGpuResources(
  device: GPUDevice,
  bindGroupLayout: GPUBindGroupLayout,
  mesh: Mesh,
): ElementGpuResources {
  const vertices = new Float32Array(mesh.vertices);
  const indices = new Uint16Array(mesh.indices);
  const uniformBuffer = device.createBuffer({
    size: 16 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return {
    vertexBuffer: createBuffer(device, vertices, GPUBufferUsage.VERTEX),
    indexBuffer: createBuffer(device, indices, GPUBufferUsage.INDEX),
    indexCount: indices.length,
    uniformBuffer,
    bindGroup: device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    }),
  };
}

export function destroyElementGpuResources(resources: ElementGpuResources): void {
  resources.vertexBuffer.destroy();
  resources.indexBuffer.destroy();
  resources.uniformBuffer.destroy();
}

function createBuffer(
  device: GPUDevice,
  data: Float32Array | Uint16Array,
  usage: GPUBufferUsageFlags,
): GPUBuffer {
  const buffer = device.createBuffer({
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

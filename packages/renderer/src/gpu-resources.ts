import type { Mesh } from "@webgame/engine";

export interface NodeGpuResources {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
}

export function createNodeGpuResources(
  device: GPUDevice,
  bindGroupLayout: GPUBindGroupLayout,
  mesh: Mesh,
): NodeGpuResources {
  const uniformBuffer = device.createBuffer({
    size: 16 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return {
    vertexBuffer: createBuffer(device, mesh.vertices, GPUBufferUsage.VERTEX),
    indexBuffer: createBuffer(device, mesh.indices, GPUBufferUsage.INDEX),
    indexCount: mesh.indices.length,
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

export function destroyNodeGpuResources(resources: NodeGpuResources): void {
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

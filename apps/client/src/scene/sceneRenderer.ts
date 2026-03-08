import { getSceneShaderCode, MAX_REMOTE_PLAYERS } from "./shader";
import type { RemotePlayerRenderState, SceneState } from "../types";

const UNIFORM_HEADER_FLOATS = 16;
const REMOTE_BALL_STRIDE = 4;
const UNIFORM_FLOAT_COUNT =
  UNIFORM_HEADER_FLOATS + MAX_REMOTE_PLAYERS * REMOTE_BALL_STRIDE;

function createFullScreenVertexBuffer(device: GPUDevice): GPUBuffer {
  const vertexData = new Float32Array([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
  return vertexBuffer;
}

function createPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
): GPURenderPipeline {
  const shaderModule = device.createShaderModule({
    code: getSceneShaderCode(),
  });

  return device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs",
      buffers: [
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });
}

function writeUniforms(
  uniformData: Float32Array,
  scene: SceneState,
  canvas: HTMLCanvasElement,
  remotePlayers: RemotePlayerRenderState[],
): void {
  uniformData[0] = canvas.width;
  uniformData[1] = canvas.height;
  uniformData[2] = scene.cameraYaw;
  uniformData[4] = scene.ballX;
  uniformData[5] = scene.ballZ;
  uniformData[6] = scene.ballRadius;
  uniformData[7] = scene.ballY;
  uniformData[8] = scene.ballOrientation[0];
  uniformData[9] = scene.ballOrientation[1];
  uniformData[10] = scene.ballOrientation[2];
  uniformData[11] = scene.ballOrientation[3];

  const remoteCount = Math.min(remotePlayers.length, MAX_REMOTE_PLAYERS);
  uniformData[12] = remoteCount;
  uniformData.fill(0, 13);

  for (let i = 0; i < remoteCount; i += 1) {
    const baseIndex = UNIFORM_HEADER_FLOATS + i * REMOTE_BALL_STRIDE;
    const remotePlayer = remotePlayers[i];
    uniformData[baseIndex] = remotePlayer.x;
    uniformData[baseIndex + 1] = remotePlayer.z;
    uniformData[baseIndex + 2] = scene.ballRadius;
    uniformData[baseIndex + 3] = remotePlayer.y;
  }
}

export function createSceneRenderer({
  device,
  canvas,
  format,
  scene,
}: {
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  format: GPUTextureFormat;
  scene: SceneState;
}): {
  render: (remotePlayers: RemotePlayerRenderState[]) => void;
  resize: (cssWidth: number, cssHeight: number) => void;
} {
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Failed to acquire WebGPU canvas context.");
  }
  const canvasContext: GPUCanvasContext = context;

  const uniformData = new Float32Array(UNIFORM_FLOAT_COUNT);
  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const vertexBuffer = createFullScreenVertexBuffer(device);
  const pipeline = createPipeline(device, format);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });
  let isConfigured = false;

  function resize(cssWidth: number, cssHeight: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(cssWidth * dpr));
    const height = Math.max(1, Math.floor(cssHeight * dpr));

    const sizeUnchanged = canvas.width === width && canvas.height === height;
    if (!sizeUnchanged) {
      canvas.width = width;
      canvas.height = height;
    }

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    if (!sizeUnchanged || !isConfigured) {
      canvasContext.configure({
        device,
        format,
        alphaMode: "opaque",
      });
      isConfigured = true;
    }
  }

  function render(remotePlayers: RemotePlayerRenderState[]): void {
    writeUniforms(uniformData, scene, canvas, remotePlayers);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: canvasContext.getCurrentTexture().createView(),
          clearValue: { r: 0.03, g: 0.05, b: 0.1, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(6);
    pass.end();

    device.queue.submit([encoder.finish()]);
  }

  return { render, resize };
}

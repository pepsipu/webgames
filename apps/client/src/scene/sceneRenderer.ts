import {
  type CameraConfig,
  getSceneShaderCode,
  MAX_REMOTE_PLAYERS,
} from "./shader";

const CAMERA: CameraConfig = Object.freeze({
  fov: 1.05,
  orbitDistance: 5.2,
  orbitHeight: 1.75,
  lookAtYOffsetFactor: 0.25,
});

const UNIFORM_HEADER_FLOATS = 8;
const REMOTE_BALL_STRIDE = 4;
const UNIFORM_FLOAT_COUNT =
  UNIFORM_HEADER_FLOATS + MAX_REMOTE_PLAYERS * REMOTE_BALL_STRIDE;

export interface SceneState {
  ballRadius: number;
  ballX: number;
  ballY: number;
  ballZ: number;
  cameraYaw: number;
}

export interface RemotePlayerRenderState {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

export type Vec3 = [number, number, number];

function normalizeVec3([x, y, z]: Vec3): Vec3 {
  const length = Math.hypot(x, y, z);
  if (length < 1e-8) {
    return [0, 0, 0];
  }

  return [x / length, y / length, z / length];
}

function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dotVec3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function getCameraPose(scene: SceneState): {
  position: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
} {
  const center: Vec3 = [scene.ballX, scene.ballRadius + scene.ballY, scene.ballZ];
  const orbit: Vec3 = [
    Math.sin(scene.cameraYaw) * CAMERA.orbitDistance,
    CAMERA.orbitHeight,
    Math.cos(scene.cameraYaw) * CAMERA.orbitDistance,
  ];

  const position: Vec3 = [
    center[0] + orbit[0],
    center[1] + orbit[1],
    center[2] + orbit[2],
  ];

  const forward = normalizeVec3([
    center[0] - position[0],
    center[1] + scene.ballRadius * CAMERA.lookAtYOffsetFactor - position[1],
    center[2] - position[2],
  ]);

  const right = normalizeVec3(crossVec3(forward, [0, 1, 0]));
  const up = crossVec3(right, forward);

  return { position, forward, right, up };
}

function createFullScreenVertexBuffer(device: GPUDevice): GPUBuffer {
  const vertexData = new Float32Array([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ]);

  const buffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(buffer, 0, vertexData);
  return buffer;
}

function createPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
): GPURenderPipeline {
  const shaderModule = device.createShaderModule({
    code: getSceneShaderCode(CAMERA),
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

  const remoteCount = Math.min(remotePlayers.length, MAX_REMOTE_PLAYERS);
  uniformData[3] = remoteCount;

  uniformData[4] = scene.ballX;
  uniformData[5] = scene.ballZ;
  uniformData[6] = scene.ballRadius;
  uniformData[7] = scene.ballY;

  uniformData.fill(0, UNIFORM_HEADER_FLOATS);

  for (let index = 0; index < remoteCount; index += 1) {
    const base = UNIFORM_HEADER_FLOATS + index * REMOTE_BALL_STRIDE;
    const player = remotePlayers[index];
    uniformData[base] = player.x;
    uniformData[base + 1] = player.z;
    uniformData[base + 2] = scene.ballRadius;
    uniformData[base + 3] = player.y;
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
  projectWorldToCanvas: (worldPosition: Vec3, cullMargin?: number) => ProjectedPoint | null;
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

    const sizeChanged = canvas.width !== width || canvas.height !== height;
    if (sizeChanged) {
      canvas.width = width;
      canvas.height = height;
    }

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    if (sizeChanged || !isConfigured) {
      canvasContext.configure({
        device,
        format,
        alphaMode: "opaque",
      });
      isConfigured = true;
    }
  }

  function projectWorldToCanvas(
    worldPosition: Vec3,
    cullMargin = 1.25,
  ): ProjectedPoint | null {
    const { position, forward, right, up } = getCameraPose(scene);

    const relative: Vec3 = [
      worldPosition[0] - position[0],
      worldPosition[1] - position[1],
      worldPosition[2] - position[2],
    ];

    const camX = dotVec3(relative, right);
    const camY = dotVec3(relative, up);
    const camZ = dotVec3(relative, forward);

    if (camZ <= 0.001) {
      return null;
    }

    const aspect = canvas.width / canvas.height;
    const uvX = camX / (camZ * aspect * CAMERA.fov);
    const uvY = camY / (camZ * CAMERA.fov);

    if (Math.abs(uvX) > cullMargin || Math.abs(uvY) > cullMargin) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: rect.left + (uvX * 0.5 + 0.5) * rect.width,
      y: rect.top + (0.5 - uvY * 0.5) * rect.height,
    };
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

  return {
    projectWorldToCanvas,
    render,
    resize,
  };
}

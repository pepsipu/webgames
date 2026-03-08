import { getSceneShaderCode, MAX_REMOTE_PLAYERS } from './shader'

const UNIFORM_HEADER_FLOATS = 16
const REMOTE_BALL_STRIDE = 4
const UNIFORM_FLOAT_COUNT = UNIFORM_HEADER_FLOATS + MAX_REMOTE_PLAYERS * REMOTE_BALL_STRIDE

function createFullScreenVertexBuffer(device) {
  const vertexData = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ])

  const vertexBuffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })

  device.queue.writeBuffer(vertexBuffer, 0, vertexData)
  return vertexBuffer
}

function createPipeline(device, format) {
  const shaderModule = device.createShaderModule({ code: getSceneShaderCode() })

  return device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs',
      buffers: [
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
    },
  })
}

function writeUniforms(uniformData, scene, canvas, remotePlayers) {
  uniformData[0] = canvas.width
  uniformData[1] = canvas.height
  uniformData[2] = scene.cameraYaw
  uniformData[3] = 0
  uniformData[4] = scene.ballX
  uniformData[5] = scene.ballZ
  uniformData[6] = scene.ballRadius
  uniformData[7] = 0
  uniformData[8] = scene.ballOrientation[0]
  uniformData[9] = scene.ballOrientation[1]
  uniformData[10] = scene.ballOrientation[2]
  uniformData[11] = scene.ballOrientation[3]
  uniformData[12] = 0
  uniformData[13] = 0
  uniformData[14] = 0
  uniformData[15] = 0

  const remoteCount = Math.min(remotePlayers.length, MAX_REMOTE_PLAYERS)
  uniformData[12] = remoteCount

  for (let i = 0; i < MAX_REMOTE_PLAYERS; i += 1) {
    const baseIndex = UNIFORM_HEADER_FLOATS + i * REMOTE_BALL_STRIDE
    if (i < remoteCount) {
      const remotePlayer = remotePlayers[i]
      uniformData[baseIndex] = Number.isFinite(remotePlayer.x) ? remotePlayer.x : 0
      uniformData[baseIndex + 1] = Number.isFinite(remotePlayer.z) ? remotePlayer.z : 0
      uniformData[baseIndex + 2] = scene.ballRadius
      uniformData[baseIndex + 3] = 0
      continue
    }

    uniformData[baseIndex] = 0
    uniformData[baseIndex + 1] = 0
    uniformData[baseIndex + 2] = 0
    uniformData[baseIndex + 3] = 0
  }
}

export function createSceneRenderer({ device, canvas, format, scene }) {
  const context = canvas.getContext('webgpu')
  const uniformData = new Float32Array(UNIFORM_FLOAT_COUNT)
  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  const vertexBuffer = createFullScreenVertexBuffer(device)
  const pipeline = createPipeline(device, format)
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  })
  let isConfigured = false

  function resize(cssWidth, cssHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.floor(cssWidth * dpr))
    const height = Math.max(1, Math.floor(cssHeight * dpr))

    const sizeUnchanged = canvas.width === width && canvas.height === height
    if (!sizeUnchanged) {
      canvas.width = width
      canvas.height = height
    }

    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`

    if (!sizeUnchanged || !isConfigured) {
      context.configure({
        device,
        format,
        alphaMode: 'opaque',
      })
      isConfigured = true
    }
  }

  function render(remotePlayers) {
    writeUniforms(uniformData, scene, canvas, remotePlayers)
    device.queue.writeBuffer(uniformBuffer, 0, uniformData)

    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.03, g: 0.05, b: 0.1, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.setVertexBuffer(0, vertexBuffer)
    pass.draw(6)
    pass.end()

    device.queue.submit([encoder.finish()])
  }

  return { render, resize }
}

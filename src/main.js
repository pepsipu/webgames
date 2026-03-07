import './style.css'
import { createChatController } from './chat/chatController'
import { createInputController } from './controls/inputController'
import { updateMovement } from './scene/movement'
import { projectWorldToCanvas } from './scene/camera'
import { getSceneShaderCode } from './scene/shader'
import { createSceneUi } from './ui/sceneUi'

const app = document.querySelector('#app')

const CONTROL_CONFIG = Object.freeze({
  stickRadiusPx: 72,
  stickDeadZone: 0.16,
  dragOrbitSensitivity: 0.006,
})

const MOVEMENT_TUNING = Object.freeze({
  moveSpeed: 18,
  orbitSpeed: 2.2,
  minX: -120,
  maxX: 120,
  minZ: -120,
  maxZ: 120,
})

function showError(message) {
  app.innerHTML = `<p class="error">${message}</p>`
}

function getViewportSize() {
  if (window.visualViewport) {
    return {
      width: Math.max(1, window.visualViewport.width),
      height: Math.max(1, window.visualViewport.height),
    }
  }

  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  }
}

function createRenderState(device, format) {
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

  const uniformData = new Float32Array(12)
  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  const shaderModule = device.createShaderModule({ code: getSceneShaderCode() })

  const pipeline = device.createRenderPipeline({
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

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  })

  return {
    uniformData,
    uniformBuffer,
    vertexBuffer,
    pipeline,
    bindGroup,
  }
}

function writeSceneUniforms(uniformData, scene, canvas) {
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
}

async function init() {
  if (!navigator.gpu) {
    showError('WebGPU is not available in this browser.')
    return
  }

  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    showError('No suitable GPU adapter was found.')
    return
  }

  const device = await adapter.requestDevice()
  const { canvas, stickBase, stickKnob, chatBubble, chatForm, chatInput } = createSceneUi(app)

  const context = canvas.getContext('webgpu')
  const format = navigator.gpu.getPreferredCanvasFormat()
  const renderState = createRenderState(device, format)

  const scene = {
    ballRadius: 0.42,
    ballX: 0,
    ballZ: 2,
    ballOrientation: new Float32Array([0, 0, 0, 1]),
    cameraYaw: 0,
  }

  const input = createInputController({
    canvas,
    stickBase,
    stickKnob,
    stickRadiusPx: CONTROL_CONFIG.stickRadiusPx,
    stickDeadZone: CONTROL_CONFIG.stickDeadZone,
    dragOrbitSensitivity: CONTROL_CONFIG.dragOrbitSensitivity,
  })

  const chat = createChatController({
    chatBubble,
    chatForm,
    chatInput,
    projectBubble: () => projectWorldToCanvas([
      scene.ballX,
      scene.ballRadius * 2.22,
      scene.ballZ,
    ], scene, canvas),
  })

  function resizeCanvas() {
    const { width: cssWidth, height: cssHeight } = getViewportSize()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.floor(cssWidth * dpr))
    const height = Math.max(1, Math.floor(cssHeight * dpr))

    if (canvas.width === width && canvas.height === height) {
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`
      return
    }

    canvas.width = width
    canvas.height = height
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`

    context.configure({
      device,
      format,
      alphaMode: 'opaque',
    })
  }

  function render() {
    writeSceneUniforms(renderState.uniformData, scene, canvas)
    device.queue.writeBuffer(renderState.uniformBuffer, 0, renderState.uniformData)

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

    pass.setPipeline(renderState.pipeline)
    pass.setBindGroup(0, renderState.bindGroup)
    pass.setVertexBuffer(0, renderState.vertexBuffer)
    pass.draw(6)
    pass.end()

    device.queue.submit([encoder.finish()])
  }

  function updateFrame(dt) {
    updateMovement(scene, MOVEMENT_TUNING, input.getMoveInput(), dt)
    render()
    chat.update()
  }

  let lastTime = performance.now()
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now

    updateFrame(dt)
    requestAnimationFrame(frame)
  }

  const handleResize = () => {
    resizeCanvas()
    chat.update()
  }

  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('orientationchange', handleResize, { passive: true })
  window.visualViewport?.addEventListener('resize', handleResize, { passive: true })

  resizeCanvas()
  updateFrame(0)
  requestAnimationFrame(frame)
}

init().catch((error) => {
  showError('Failed to initialize WebGPU. Check the console for details.')
  console.error(error)
})

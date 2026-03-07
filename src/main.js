import './style.css'
import { createInputController } from './controls/inputController'
import { updateMovement } from './scene/movement'
import { getSceneShaderCode } from './scene/shader'

const app = document.querySelector('#app')
const STICK_RADIUS_PX = 72
const STICK_DEAD_ZONE = 0.16

function showError(message) {
  app.innerHTML = `<p class="error">${message}</p>`
}

function createSceneUi() {
  const sceneRoot = document.createElement('div')
  sceneRoot.className = 'scene-root'

  const canvas = document.createElement('canvas')
  canvas.className = 'gpu-canvas'

  const hint = document.createElement('div')
  hint.className = 'hint'
  hint.textContent = 'Drag up/down to move the ball. Drag left/right to orbit around it. Desktop: WASD / Arrow keys.'

  const stickBase = document.createElement('div')
  stickBase.className = 'stick-base'

  const stickKnob = document.createElement('div')
  stickKnob.className = 'stick-knob'

  sceneRoot.append(canvas, hint, stickBase, stickKnob)
  app.replaceChildren(sceneRoot)

  return { canvas, stickBase, stickKnob }
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
  const { canvas, stickBase, stickKnob } = createSceneUi()

  const context = canvas.getContext('webgpu')
  const format = navigator.gpu.getPreferredCanvasFormat()

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

  const shaderModule = device.createShaderModule({
    code: getSceneShaderCode(),
  })

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

  const scene = {
    ballRadius: 0.42,
    ballX: 0,
    ballZ: 2,
    ballOrientation: new Float32Array([0, 0, 0, 1]),
    cameraYaw: 0,
  }

  const tuning = {
    moveSpeed: 18,
    orbitSpeed: 2.2,
    dragOrbitSensitivity: 0.006,
    minX: -120,
    maxX: 120,
    minZ: -120,
    maxZ: 120,
  }

  const input = createInputController({
    canvas,
    stickBase,
    stickKnob,
    stickRadiusPx: STICK_RADIUS_PX,
    stickDeadZone: STICK_DEAD_ZONE,
    dragOrbitSensitivity: tuning.dragOrbitSensitivity,
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

  let lastTime = performance.now()
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now

    updateMovement(scene, tuning, input.getMoveInput(), dt)
    render()

    requestAnimationFrame(frame)
  }

  const handleResize = () => {
    resizeCanvas()
  }

  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('orientationchange', handleResize, { passive: true })
  window.visualViewport?.addEventListener('resize', handleResize, { passive: true })

  resizeCanvas()
  render()
  requestAnimationFrame(frame)
}

init().catch((error) => {
  showError('Failed to initialize WebGPU. Check the console for details.')
  console.error(error)
})

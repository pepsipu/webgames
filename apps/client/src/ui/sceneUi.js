const DEFAULT_HINT = 'Drag up/down to move the ball and left/right to orbit. Desktop: WASD / Arrow keys. Tap or press Space to jump.'

export function createSceneUi(rootElement, hintText = DEFAULT_HINT) {
  const sceneRoot = document.createElement('div')
  sceneRoot.className = 'scene-root'

  const canvas = document.createElement('canvas')
  canvas.className = 'gpu-canvas'

  const hint = document.createElement('div')
  hint.className = 'hint'
  hint.textContent = hintText

  const chatBubble = document.createElement('div')
  chatBubble.className = 'chat-bubble'
  chatBubble.textContent = ''

  const remoteLayer = document.createElement('div')
  remoteLayer.className = 'remote-layer'

  const networkStatus = document.createElement('div')
  networkStatus.className = 'network-status connecting'
  networkStatus.textContent = 'Connecting...'

  const chatForm = document.createElement('form')
  chatForm.className = 'chat-ui'
  chatForm.autocomplete = 'off'

  const chatInput = document.createElement('input')
  chatInput.className = 'chat-input'
  chatInput.type = 'text'
  chatInput.placeholder = 'Say something...'
  chatInput.maxLength = 140

  const chatSend = document.createElement('button')
  chatSend.className = 'chat-send'
  chatSend.type = 'submit'
  chatSend.textContent = 'Send'

  chatForm.append(chatInput, chatSend)
  sceneRoot.append(
    canvas,
    hint,
    chatBubble,
    remoteLayer,
    networkStatus,
    chatForm,
  )

  rootElement.replaceChildren(sceneRoot)

  return {
    canvas,
    chatBubble,
    chatForm,
    chatInput,
    remoteLayer,
    networkStatus,
  }
}

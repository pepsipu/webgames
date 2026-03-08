const DEFAULT_HINT = 'Drag up/down to move the ball and left/right to orbit. Desktop: WASD / Arrow keys. Tap or press Space to jump.'

function createElement(tagName, className, setup = null) {
  const element = document.createElement(tagName)
  element.className = className
  setup?.(element)
  return element
}

export function createSceneUi(rootElement, hintText = DEFAULT_HINT) {
  const sceneRoot = createElement('div', 'scene-root')
  const canvas = createElement('canvas', 'gpu-canvas')
  const hint = createElement('div', 'hint', (node) => {
    node.textContent = hintText
  })
  const chatBubble = createElement('div', 'chat-bubble', (node) => {
    node.textContent = ''
  })
  const remoteLayer = createElement('div', 'remote-layer')
  const networkStatus = createElement('div', 'network-status connecting', (node) => {
    node.textContent = 'Connecting...'
  })
  const chatForm = createElement('form', 'chat-ui', (node) => {
    node.autocomplete = 'off'
  })
  const chatInput = createElement('input', 'chat-input', (node) => {
    node.type = 'text'
    node.placeholder = 'Say something...'
    node.maxLength = 140
  })
  const chatSend = createElement('button', 'chat-send', (node) => {
    node.type = 'submit'
    node.textContent = 'Send'
  })

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

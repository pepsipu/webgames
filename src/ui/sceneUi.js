const DEFAULT_HINT = 'Drag up/down to move the ball. Drag left/right to orbit around it. Desktop: WASD / Arrow keys.'

export function createSceneUi(rootElement, hintText = DEFAULT_HINT) {
  const sceneRoot = document.createElement('div')
  sceneRoot.className = 'scene-root'

  const canvas = document.createElement('canvas')
  canvas.className = 'gpu-canvas'

  const hint = document.createElement('div')
  hint.className = 'hint'
  hint.textContent = hintText

  const stickBase = document.createElement('div')
  stickBase.className = 'stick-base'

  const stickKnob = document.createElement('div')
  stickKnob.className = 'stick-knob'

  const chatBubble = document.createElement('div')
  chatBubble.className = 'chat-bubble'
  chatBubble.textContent = ''

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
  sceneRoot.append(canvas, hint, chatBubble, chatForm, stickBase, stickKnob)

  rootElement.replaceChildren(sceneRoot)

  return {
    canvas,
    stickBase,
    stickKnob,
    chatBubble,
    chatForm,
    chatInput,
  }
}

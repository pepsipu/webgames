import { isTypingTarget } from '../utils/dom'

export function createChatController({
  chatBubble,
  chatForm,
  chatInput,
  projectBubble,
  onSubmit,
}) {
  let message = ''

  function setBubbleVisible(visible) {
    chatBubble.classList.toggle('visible', visible)
  }

  function setMessage(nextMessage) {
    message = typeof nextMessage === 'string' ? nextMessage.trim() : ''
    chatBubble.textContent = message
    update()
  }

  function update() {
    if (!message) {
      setBubbleVisible(false)
      return
    }

    const projected = projectBubble()
    if (!projected) {
      setBubbleVisible(false)
      return
    }

    chatBubble.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`
    setBubbleVisible(true)
  }

  function handleSubmit(event) {
    event.preventDefault()

    const text = chatInput.value.trim()
    if (!text) {
      return
    }

    setMessage(text)
    chatInput.value = ''
    chatInput.blur()

    onSubmit?.(text)
  }

  function handleShortcut(event) {
    if (event.code !== 'Slash') {
      return
    }

    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
      return
    }

    if (isTypingTarget(event.target)) {
      return
    }

    event.preventDefault()
    chatInput.focus()
  }

  chatForm.addEventListener('submit', handleSubmit)
  window.addEventListener('keydown', handleShortcut, { passive: false })

  return { setMessage, update }
}

import { isTypingTarget } from '../utils/dom'

export function createChatController({ chatBubble, chatForm, chatInput, projectBubble }) {
  const state = {
    message: '',
  }

  function hideBubble() {
    chatBubble.classList.remove('visible')
  }

  function update() {
    if (!state.message) {
      hideBubble()
      return
    }

    const projected = projectBubble()
    if (!projected) {
      hideBubble()
      return
    }

    chatBubble.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`
    chatBubble.classList.add('visible')
  }

  function handleSubmit(event) {
    event.preventDefault()

    const text = chatInput.value.trim()
    state.message = text
    chatBubble.textContent = text
    chatInput.value = ''
    chatInput.blur()

    update()
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

  return {
    update,
    dispose() {
      chatForm.removeEventListener('submit', handleSubmit)
      window.removeEventListener('keydown', handleShortcut)
    },
  }
}

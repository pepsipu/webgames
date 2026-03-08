function toFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback
}

function createBubble() {
  const bubble = document.createElement('div')
  bubble.className = 'remote-player-chat hidden'
  return bubble
}

export function createRemotePlayersOverlay({ layerElement, projectPlayer }) {
  const players = new Map()

  function ensurePlayer(playerId) {
    let state = players.get(playerId)
    if (state) {
      return state
    }

    const bubble = createBubble()
    layerElement.append(bubble)

    state = {
      id: playerId,
      x: 0,
      y: 0,
      z: 0,
      message: '',
      bubble,
    }

    players.set(playerId, state)
    return state
  }

  function upsertPlayer(player, localPlayerId = null) {
    if (!player || typeof player.id !== 'string' || player.id === localPlayerId) {
      return
    }

    const state = ensurePlayer(player.id)
    state.x = toFiniteNumber(player.x, state.x)
    state.y = toFiniteNumber(player.y, state.y)
    state.z = toFiniteNumber(player.z, state.z)
  }

  function setMessage(playerId, text) {
    const state = players.get(playerId)
    if (!state) {
      return
    }

    const message = typeof text === 'string' ? text.trim() : ''
    state.message = message
    state.bubble.textContent = message
  }

  function removePlayer(playerId) {
    const state = players.get(playerId)
    if (!state) {
      return
    }

    state.bubble.remove()
    players.delete(playerId)
  }

  function replaceAll(playerList, localPlayerId = null) {
    const nextIds = new Set()

    for (const player of playerList) {
      if (!player || typeof player.id !== 'string' || player.id === localPlayerId) {
        continue
      }

      nextIds.add(player.id)
      upsertPlayer(player, localPlayerId)
    }

    for (const playerId of players.keys()) {
      if (!nextIds.has(playerId)) {
        removePlayer(playerId)
      }
    }
  }

  function listPlayers() {
    return Array.from(players.values())
  }

  function update() {
    for (const state of players.values()) {
      const projected = state.message ? projectPlayer(state) : null
      const visible = Boolean(projected)
      if (visible) {
        state.bubble.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`
      }

      state.bubble.classList.toggle('hidden', !visible)
      state.bubble.classList.toggle('visible', visible)
    }
  }

  return {
    listPlayers,
    removePlayer,
    replaceAll,
    setMessage,
    update,
    upsertPlayer,
  }
}

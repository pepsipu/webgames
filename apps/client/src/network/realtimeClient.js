export const CONNECTION_STATUS = Object.freeze({
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
})

const RECONNECT_BASE_DELAY_MS = 600
const RECONNECT_MAX_DELAY_MS = 10_000

function resolveWebSocketUrl() {
  const configuredUrl = import.meta.env.VITE_WS_URL
  if (typeof configuredUrl === 'string' && configuredUrl.length > 0) {
    return configuredUrl
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws`
}

function parseMessage(data) {
  if (typeof data !== 'string') {
    return null
  }

  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function createRealtimeClient(callbacks) {
  const { onStatusChange, onWelcome, onPlayer, onPlayerLeave, onChat } = callbacks

  const socketUrl = resolveWebSocketUrl()
  const handlePlayerMessage = ({ player }) => onPlayer?.(player)
  const messageHandlers = {
    welcome: onWelcome,
    'player:join': handlePlayerMessage,
    'player:update': handlePlayerMessage,
    'player:leave': ({ playerId }) => onPlayerLeave?.(playerId),
    chat: onChat,
  }

  let socket = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  let isClosedByClient = false

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function scheduleReconnect() {
    const delayMs = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempts,
    )

    reconnectAttempts += 1
    reconnectTimer = window.setTimeout(connect, delayMs)
  }

  function handleMessage(event) {
    const message = parseMessage(event.data)
    if (!message || typeof message !== 'object') {
      return
    }

    const handler = messageHandlers[message.type]
    handler?.(message)
  }

  function connect() {
    clearReconnectTimer()
    if (isClosedByClient) {
      return
    }

    onStatusChange?.(CONNECTION_STATUS.CONNECTING)
    socket = new WebSocket(socketUrl)

    socket.addEventListener('open', () => {
      reconnectAttempts = 0
      onStatusChange?.(CONNECTION_STATUS.CONNECTED)
    })

    socket.addEventListener('message', handleMessage)

    socket.addEventListener('close', () => {
      socket = null

      if (isClosedByClient) {
        return
      }

      onStatusChange?.(CONNECTION_STATUS.DISCONNECTED)
      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      socket?.close()
    })
  }

  function send(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    socket.send(JSON.stringify(payload))
    return true
  }

  connect()

  return {
    close() {
      isClosedByClient = true
      clearReconnectTimer()
      socket?.close()
      socket = null
    },
    sendChat: (text) => send({ type: 'chat', text }),
    sendPosition: (position) => send({ type: 'position', ...position }),
  }
}

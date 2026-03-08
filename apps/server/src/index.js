import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'

const PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const CHAT_LIMIT = 140
const WORLD_MIN = -120
const WORLD_MAX = 120
const WORLD_GROUND_Y = 0
const WORLD_MAX_Y = 40
const SOCKET_OPEN_STATE = 1

const MESSAGE_TYPE = Object.freeze({
  WELCOME: 'welcome',
  POSITION: 'position',
  CHAT: 'chat',
  PLAYER_JOIN: 'player:join',
  PLAYER_UPDATE: 'player:update',
  PLAYER_LEAVE: 'player:leave',
})

const app = new Hono()
const playersById = new Map()
const playerIdBySocket = new Map()

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeYaw(yaw) {
  const cycle = Math.PI * 2
  const normalized = yaw % cycle
  return normalized < 0 ? normalized + cycle : normalized
}

function toFiniteNumber(value) {
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

function parseJsonMessage(rawData) {
  try {
    return JSON.parse(rawData.toString())
  } catch {
    return null
  }
}

function send(socket, payload) {
  if (socket.readyState !== SOCKET_OPEN_STATE) {
    return false
  }

  socket.send(JSON.stringify(payload))
  return true
}

function broadcast(payload, excludedPlayerId = null) {
  const serialized = JSON.stringify(payload)

  for (const [socket, playerId] of playerIdBySocket.entries()) {
    if (playerId === excludedPlayerId || socket.readyState !== SOCKET_OPEN_STATE) {
      continue
    }

    socket.send(serialized)
  }
}

function getSpawnPosition(playerIndex) {
  if (playerIndex === 0) {
    return { x: 0, z: 2 }
  }

  const angle = (playerIndex - 1) * 1.47
  const radius = 5 + ((playerIndex - 1) % 3) * 2

  return {
    x: clamp(Math.cos(angle) * radius, WORLD_MIN, WORLD_MAX),
    z: clamp(2 + Math.sin(angle) * radius, WORLD_MIN, WORLD_MAX),
  }
}

function createPlayerState(id, playerIndex) {
  const spawn = getSpawnPosition(playerIndex)

  return {
    id,
    x: spawn.x,
    y: WORLD_GROUND_Y,
    z: spawn.z,
    yaw: 0,
    updatedAt: Date.now(),
  }
}

function readPosition(payload, player) {
  const x = toFiniteNumber(payload.x)
  const y = toFiniteNumber(payload.y)
  const z = toFiniteNumber(payload.z)
  const yaw = toFiniteNumber(payload.yaw)

  if (x === null || z === null || yaw === null) {
    return null
  }

  return {
    x: clamp(x, WORLD_MIN, WORLD_MAX),
    y: clamp(y ?? player.y ?? WORLD_GROUND_Y, WORLD_GROUND_Y, WORLD_MAX_Y),
    z: clamp(z, WORLD_MIN, WORLD_MAX),
    yaw: normalizeYaw(yaw),
  }
}

function readChat(payload) {
  if (typeof payload.text !== 'string') {
    return null
  }

  const text = payload.text.trim().slice(0, CHAT_LIMIT)
  return text.length > 0 ? text : null
}

function handleClientMessage(socket, rawData) {
  const payload = parseJsonMessage(rawData)
  if (!payload || typeof payload !== 'object' || typeof payload.type !== 'string') {
    return
  }

  const playerId = playerIdBySocket.get(socket)
  const player = playerId ? playersById.get(playerId) : null
  if (!playerId || !player) {
    return
  }

  if (payload.type === MESSAGE_TYPE.POSITION) {
    const nextPosition = readPosition(payload, player)
    if (!nextPosition) {
      return
    }

    Object.assign(player, nextPosition, { updatedAt: Date.now() })
    broadcast({ type: MESSAGE_TYPE.PLAYER_UPDATE, player }, playerId)
    return
  }

  if (payload.type === MESSAGE_TYPE.CHAT) {
    const text = readChat(payload)
    if (!text) {
      return
    }

    broadcast({
      type: MESSAGE_TYPE.CHAT,
      fromPlayerId: playerId,
      text,
      createdAt: Date.now(),
    })
  }
}

function disconnectSocket(socket) {
  const playerId = playerIdBySocket.get(socket)
  if (!playerId) {
    return
  }

  playerIdBySocket.delete(socket)

  if (playersById.delete(playerId)) {
    broadcast({
      type: MESSAGE_TYPE.PLAYER_LEAVE,
      playerId,
    })
  }
}

app.get('/', (context) => context.text('Webgame server is running.'))
app.get('/health', (context) => context.json({ ok: true, players: playersById.size }))

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Hono server listening on http://localhost:${info.port}`)
  },
)

const webSocketServer = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host ?? 'localhost'
  const url = new URL(request.url ?? '/', `http://${host}`)

  if (url.pathname !== '/ws') {
    socket.destroy()
    return
  }

  webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
    webSocketServer.emit('connection', webSocket)
  })
})

webSocketServer.on('connection', (socket) => {
  const playerId = randomUUID().slice(0, 8)
  const player = createPlayerState(playerId, playersById.size)

  playersById.set(playerId, player)
  playerIdBySocket.set(socket, playerId)

  send(socket, {
    type: MESSAGE_TYPE.WELCOME,
    selfPlayerId: playerId,
    players: Array.from(playersById.values()),
  })

  broadcast(
    {
      type: MESSAGE_TYPE.PLAYER_JOIN,
      player,
    },
    playerId,
  )

  socket.on('message', (data) => {
    handleClientMessage(socket, data)
  })

  const handleDisconnect = () => disconnectSocket(socket)
  socket.on('close', handleDisconnect)
  socket.on('error', handleDisconnect)
})

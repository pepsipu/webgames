export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeInput(x, y) {
  const length = Math.hypot(x, y)
  if (length <= 1) {
    return { x, y }
  }

  return {
    x: x / length,
    y: y / length,
  }
}

export function normalizeQuat(q) {
  const length = Math.hypot(q[0], q[1], q[2], q[3])
  if (length < 1e-8) {
    return [0, 0, 0, 1]
  }

  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length]
}

export function multiplyQuat(a, b) {
  const [ax, ay, az, aw] = a
  const [bx, by, bz, bw] = b

  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]
}

export function quatFromAxisAngle(x, y, z, angle) {
  const half = angle * 0.5
  const s = Math.sin(half)
  return [x * s, y * s, z * s, Math.cos(half)]
}

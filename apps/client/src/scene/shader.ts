export const MAX_REMOTE_PLAYERS = 12;

export interface CameraConfig {
  fov: number;
  orbitDistance: number;
  orbitHeight: number;
  lookAtYOffsetFactor: number;
}

export function getSceneShaderCode(camera: CameraConfig): string {
  return `
    const INF = 1e9;
    const MAX_REMOTE_BALLS = ${MAX_REMOTE_PLAYERS};

    struct Params {
      resolution: vec2f,
      cameraYaw: f32,
      remoteCount: f32,
      ball: vec4f, // x, z, radius, yOffset
      remoteBalls: array<vec4f, MAX_REMOTE_BALLS>,
    }

    @group(0) @binding(0)
    var<uniform> params: Params;

    struct VertexOut {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    }

    fn intersectSphere(ro: vec3f, rd: vec3f, center: vec3f, radius: f32) -> f32 {
      let oc = ro - center;
      let b = dot(oc, rd);
      let c = dot(oc, oc) - radius * radius;
      let h = b * b - c;
      if (h < 0.0) {
        return INF;
      }

      let s = sqrt(h);
      let t0 = -b - s;
      if (t0 > 0.001) {
        return t0;
      }

      let t1 = -b + s;
      if (t1 > 0.001) {
        return t1;
      }

      return INF;
    }

    fn intersectGround(ro: vec3f, rd: vec3f) -> f32 {
      if (rd.y >= -0.0001) {
        return INF;
      }

      let t = -ro.y / rd.y;
      return select(INF, t, t > 0.001);
    }

    fn shadeSphere(pos: vec3f, center: vec3f, isLocal: bool, remoteIndex: i32) -> vec3f {
      let normal = normalize(pos - center);
      let lightDir = normalize(vec3f(-0.35, 1.0, 0.45));
      let diffuse = max(dot(normal, lightDir), 0.0);
      let rim = pow(1.0 - max(dot(normal, normalize(-pos)), 0.0), 2.5);

      let remoteTint = 0.5 + 0.5 * sin(f32(remoteIndex) * 1.37);
      let localA = vec3f(0.95, 0.50, 0.15);
      let localB = vec3f(0.89, 0.20, 0.10);
      let remoteA = mix(vec3f(0.20, 0.66, 0.98), vec3f(0.20, 0.90, 0.74), remoteTint);
      let remoteB = vec3f(0.07, 0.21, 0.43);

      let stripe = 0.5 + 0.5 * sin(normal.z * 14.0 + normal.x * 6.0);
      let localColor = mix(localA, localB, stripe * 0.65);
      let remoteColor = mix(remoteA, remoteB, 0.4 - 0.2 * normal.y);
      let base = select(remoteColor, localColor, isLocal);

      return base * (0.22 + diffuse * 0.78) + vec3f(0.24, 0.32, 0.44) * rim * 0.12;
    }

    fn shadeGround(pos: vec3f) -> vec3f {
      let near = vec3f(0.13, 0.17, 0.25);
      let far = vec3f(0.04, 0.07, 0.12);
      let fog = clamp(length(pos.xz - params.ball.xy) / 90.0, 0.0, 1.0);
      var color = mix(near, far, fog);

      let gx = abs(fract((pos.x + 100.0) / 5.0) - 0.5);
      let gz = abs(fract((pos.z + 100.0) / 5.0) - 0.5);
      let grid = 1.0 - smoothstep(0.0, 0.06, min(gx, gz) * 2.0);
      color += vec3f(0.08, 0.1, 0.14) * grid;

      return color;
    }

    @vertex
    fn vs(@location(0) position: vec2f) -> VertexOut {
      var out: VertexOut;
      out.position = vec4f(position, 0.0, 1.0);
      out.uv = position * 0.5 + vec2f(0.5, 0.5);
      return out;
    }

    @fragment
    fn fs(in: VertexOut) -> @location(0) vec4f {
      let resolution = max(params.resolution, vec2f(1.0, 1.0));
      let aspect = resolution.x / resolution.y;
      let uv = vec2f(in.uv.x * 2.0 - 1.0, in.uv.y * 2.0 - 1.0);

      let localCenter = vec3f(params.ball.x, params.ball.z + params.ball.w, params.ball.y);
      let orbitOffset = vec3f(
        sin(params.cameraYaw) * ${camera.orbitDistance},
        ${camera.orbitHeight},
        cos(params.cameraYaw) * ${camera.orbitDistance}
      );

      let cameraPos = localCenter + orbitOffset;
      let lookAt = localCenter + vec3f(0.0, params.ball.z * ${camera.lookAtYOffsetFactor}, 0.0);
      let forward = normalize(lookAt - cameraPos);
      let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
      let up = cross(right, forward);
      let rayDir = normalize(forward + right * uv.x * aspect * ${camera.fov} + up * uv.y * ${camera.fov});

      var tNearest = INF;
      var hitType = 0i;
      var remoteHitIndex = -1i;

      let tLocal = intersectSphere(cameraPos, rayDir, localCenter, params.ball.z);
      if (tLocal < tNearest) {
        tNearest = tLocal;
        hitType = 1;
      }

      let remoteCount = i32(clamp(params.remoteCount, 0.0, ${MAX_REMOTE_PLAYERS}.0));
      for (var i = 0; i < remoteCount; i = i + 1) {
        let remote = params.remoteBalls[i];
        if (remote.z <= 0.0) {
          continue;
        }

        let remoteCenter = vec3f(remote.x, remote.z + remote.w, remote.y);
        let tRemote = intersectSphere(cameraPos, rayDir, remoteCenter, remote.z);
        if (tRemote < tNearest) {
          tNearest = tRemote;
          hitType = 2;
          remoteHitIndex = i;
        }
      }

      let tGround = intersectGround(cameraPos, rayDir);
      if (tGround < tNearest) {
        tNearest = tGround;
        hitType = 3;
      }

      var color = vec3f(0.03, 0.05, 0.1);
      if (hitType == 1) {
        let pos = cameraPos + rayDir * tNearest;
        color = shadeSphere(pos, localCenter, true, 0);
      } else if (hitType == 2) {
        let remote = params.remoteBalls[remoteHitIndex];
        let center = vec3f(remote.x, remote.z + remote.w, remote.y);
        let pos = cameraPos + rayDir * tNearest;
        color = shadeSphere(pos, center, false, remoteHitIndex);
      } else if (hitType == 3) {
        let pos = cameraPos + rayDir * tNearest;
        color = shadeGround(pos);
      }

      if (tNearest < INF) {
        let fog = clamp(tNearest / 85.0, 0.0, 1.0);
        color = mix(color, vec3f(0.025, 0.04, 0.08), fog);
      }

      return vec4f(color, 1.0);
    }
  `;
}

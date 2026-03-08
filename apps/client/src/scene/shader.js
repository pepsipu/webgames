import { CAMERA_CONFIG } from './camera'

export const MAX_REMOTE_PLAYERS = 12

export function getSceneShaderCode() {
  return `
    const INF = 1e9;
    const MAX_REMOTE_BALLS = ${MAX_REMOTE_PLAYERS};

    struct Params {
      resolution: vec2f,
      cameraYaw: f32,
      _pad0: f32,
      ballPos: vec2f,
      ballRadius: f32,
      ballYOffset: f32,
      ballOrientation: vec4f,
      remoteCount: f32,
      _pad2x: f32,
      _pad2y: f32,
      _pad2z: f32,
      remoteBalls: array<vec4f, MAX_REMOTE_BALLS>,
    }

    @group(0) @binding(0)
    var<uniform> params: Params;

    struct VertexOut {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    }

    fn quatConjugate(q: vec4f) -> vec4f {
      return vec4f(-q.xyz, q.w);
    }

    fn quatRotate(v: vec3f, q: vec4f) -> vec3f {
      let t = 2.0 * cross(q.xyz, v);
      return v + q.w * t + cross(q.xyz, t);
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
      if (t > 0.001) {
        return t;
      }

      return INF;
    }

    fn shadeGround(pos: vec3f) -> vec3f {
      let near = vec3f(0.13, 0.17, 0.25);
      let far = vec3f(0.04, 0.07, 0.12);
      let fog = clamp(length(pos.xz - params.ballPos) / 90.0, 0.0, 1.0);
      var color = mix(near, far, fog);

      let majorGrid = 1.0 - smoothstep(0.0, 0.06, min(
        abs(fract((pos.x + 100.0) / 5.0) - 0.5),
        abs(fract((pos.z + 100.0) / 5.0) - 0.5)
      ) * 2.0);

      let minorGrid = 1.0 - smoothstep(0.0, 0.02, min(
        abs(fract((pos.x + 100.0)) - 0.5),
        abs(fract((pos.z + 100.0)) - 0.5)
      ) * 2.0);

      color += vec3f(0.09, 0.12, 0.17) * majorGrid;
      color += vec3f(0.04, 0.05, 0.08) * minorGrid;

      return color;
    }

    fn shadeLocalBall(pos: vec3f, center: vec3f) -> vec3f {
      let normal = normalize(pos - center);
      let localNormal = quatRotate(normal, quatConjugate(params.ballOrientation));
      let stripe = 0.5 + 0.5 * sin(localNormal.z * 16.0 + localNormal.x * 7.0);

      let baseA = vec3f(0.95, 0.50, 0.15);
      let baseB = vec3f(0.88, 0.20, 0.10);
      let albedo = mix(baseA, baseB, stripe * 0.6);

      let lightDir = normalize(vec3f(-0.4, 1.0, 0.5));
      let diffuse = max(dot(normal, lightDir), 0.0);
      let ambient = 0.2;

      return albedo * (ambient + diffuse * 0.8);
    }

    fn shadeRemoteBall(pos: vec3f, center: vec3f, remoteIndex: i32) -> vec3f {
      let normal = normalize(pos - center);
      let tint = 0.5 + 0.5 * sin(f32(remoteIndex) * 1.37);

      let baseA = mix(vec3f(0.20, 0.66, 0.98), vec3f(0.20, 0.90, 0.74), tint);
      let baseB = vec3f(0.07, 0.21, 0.43);
      let albedo = mix(baseA, baseB, 0.35 + 0.15 * (1.0 - normal.y));

      let lightDir = normalize(vec3f(-0.4, 1.0, 0.5));
      let diffuse = max(dot(normal, lightDir), 0.0);
      let ambient = 0.24;

      return albedo * (ambient + diffuse * 0.76);
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
      let fov = ${CAMERA_CONFIG.fov};

      let localCenter = vec3f(params.ballPos.x, params.ballRadius + params.ballYOffset, params.ballPos.y);
      let orbitDistance = ${CAMERA_CONFIG.orbitDistance};
      let orbitHeight = ${CAMERA_CONFIG.orbitHeight};
      let orbitOffset = vec3f(
        sin(params.cameraYaw) * orbitDistance,
        orbitHeight,
        cos(params.cameraYaw) * orbitDistance
      );

      let cameraPos = localCenter + orbitOffset;
      let lookAt = localCenter + vec3f(0.0, params.ballRadius * ${CAMERA_CONFIG.lookAtYOffsetFactor}, 0.0);

      let forward = normalize(lookAt - cameraPos);
      let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
      let up = cross(right, forward);

      let rayDir = normalize(forward + right * uv.x * aspect * fov + up * uv.y * fov);

      var tNearest = INF;
      var hitType = 0i;
      var remoteHitIndex = -1i;

      let tLocalBall = intersectSphere(cameraPos, rayDir, localCenter, params.ballRadius);
      if (tLocalBall < tNearest) {
        tNearest = tLocalBall;
        hitType = 1;
      }

      let remoteCount = i32(clamp(params.remoteCount, 0.0, ${MAX_REMOTE_PLAYERS}.0));
      for (var i = 0; i < remoteCount; i = i + 1) {
        let remote = params.remoteBalls[i];
        let remoteRadius = remote.z;

        if (remoteRadius <= 0.0) {
          continue;
        }

        let remoteCenter = vec3f(remote.x, remoteRadius + remote.w, remote.y);
        let tRemoteBall = intersectSphere(cameraPos, rayDir, remoteCenter, remoteRadius);

        if (tRemoteBall < tNearest) {
          tNearest = tRemoteBall;
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
        color = shadeLocalBall(pos, localCenter);
      } else if (hitType == 2) {
        let remote = params.remoteBalls[remoteHitIndex];
        let remoteCenter = vec3f(remote.x, remote.z + remote.w, remote.y);
        let pos = cameraPos + rayDir * tNearest;
        color = shadeRemoteBall(pos, remoteCenter, remoteHitIndex);
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
  `
}

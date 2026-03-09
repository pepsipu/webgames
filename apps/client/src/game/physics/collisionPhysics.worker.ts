import RAPIER from "@dimforge/rapier3d-compat";
import type {
  PhysicsBallState,
  PhysicsWorkerRequest,
  PhysicsWorkerResponse,
} from "./types";

let world: RAPIER.World | null = null;
let localBody: RAPIER.RigidBody | null = null;
let ballRadius = 0.42;
const remoteBodies: RAPIER.RigidBody[] = [];
let isReady = false;

function toRapierVector(position: PhysicsBallState): RAPIER.Vector {
  return {
    x: position.x,
    y: position.y,
    z: position.z,
  };
}

function postMessageToMain(message: PhysicsWorkerResponse): void {
  self.postMessage(message);
}

function ensureWorld(): RAPIER.World {
  if (world) {
    return world;
  }

  world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  return world;
}

function ensureLocalBody(startPosition: PhysicsBallState): RAPIER.RigidBody {
  const nextWorld = ensureWorld();
  if (localBody) {
    return localBody;
  }

  const body = nextWorld.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(startPosition.x, startPosition.y, startPosition.z)
      .setGravityScale(0)
      .setCanSleep(false)
      .setCcdEnabled(true)
      .setLinearDamping(0)
      .setAngularDamping(100)
      .lockRotations(),
  );

  nextWorld.createCollider(
    RAPIER.ColliderDesc.ball(ballRadius).setRestitution(0).setFriction(0),
    body,
  );

  localBody = body;
  return body;
}

function clearRemoteBodies(): void {
  if (!world) {
    return;
  }

  while (remoteBodies.length > 0) {
    const body = remoteBodies.pop();
    if (!body) {
      break;
    }

    world.removeRigidBody(body);
  }
}

function syncLocal(position: PhysicsBallState): void {
  const body = ensureLocalBody(position);
  body.setTranslation(toRapierVector(position), true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

function setRemoteBodies(remotes: PhysicsBallState[]): void {
  const nextWorld = ensureWorld();
  clearRemoteBodies();

  for (const remote of remotes) {
    const body = nextWorld.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(remote.x, remote.y, remote.z),
    );

    nextWorld.createCollider(
      RAPIER.ColliderDesc.ball(ballRadius).setRestitution(0).setFriction(0),
      body,
    );

    remoteBodies.push(body);
  }
}

function step({
  requestId,
  current,
  target,
  dt,
  remotes,
}: Extract<PhysicsWorkerRequest, { type: "step" }>): void {
  if (!world || !isReady) {
    return;
  }

  const body = ensureLocalBody(current);
  body.setTranslation(toRapierVector(current), true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);

  setRemoteBodies(remotes);

  world.timestep = Math.max(dt, 1 / 240);
  const invDt = dt > 1e-5 ? 1 / dt : 0;
  body.setLinvel(
    {
      x: (target.x - current.x) * invDt,
      y: (target.y - current.y) * invDt,
      z: (target.z - current.z) * invDt,
    },
    true,
  );

  world.step();
  const translation = body.translation();

  postMessageToMain({
    type: "step:result",
    requestId,
    local: {
      x: translation.x,
      y: translation.y,
      z: translation.z,
    },
  });
}

async function init(nextBallRadius: number): Promise<void> {
  if (isReady) {
    return;
  }

  await RAPIER.init();
  ballRadius = nextBallRadius;
  ensureWorld();
  isReady = true;

  postMessageToMain({ type: "ready" });
}

self.addEventListener("message", (event: MessageEvent<PhysicsWorkerRequest>) => {
  const message = event.data;
  if (!message) {
    return;
  }

  if (message.type === "init") {
    void init(message.ballRadius);
    return;
  }

  if (!isReady) {
    return;
  }

  if (message.type === "sync") {
    syncLocal(message.local);
    return;
  }

  if (message.type === "step") {
    step(message);
  }
});

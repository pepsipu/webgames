import type {
  PhysicsBallState,
  PhysicsStepInput,
  PhysicsWorkerRequest,
  PhysicsWorkerResponse,
} from "./types";

function cloneBallState(position: PhysicsBallState): PhysicsBallState {
  return { x: position.x, y: position.y, z: position.z };
}

function cloneStepInput(step: PhysicsStepInput): PhysicsStepInput {
  return {
    dt: step.dt,
    current: cloneBallState(step.current),
    target: cloneBallState(step.target),
    remotes: step.remotes.map(cloneBallState),
  };
}

export class CollisionPhysics {
  private readonly worker: Worker;
  private isReady = false;
  private isStepInFlight = false;
  private nextRequestId = 0;
  private pendingSync: PhysicsBallState | null = null;
  private pendingStep: PhysicsStepInput | null = null;
  private latestResolvedLocal: PhysicsBallState | null = null;
  private ignoreResultsBeforeRequestId = 0;

  constructor(ballRadius: number) {
    this.worker = new Worker(new URL("./collisionPhysics.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.addEventListener("message", this.onMessage);
    this.postMessage({
      type: "init",
      ballRadius,
    });
  }

  dispose(): void {
    this.worker.removeEventListener("message", this.onMessage);
    this.worker.terminate();
  }

  syncLocal(local: PhysicsBallState): void {
    const next = cloneBallState(local);
    this.pendingSync = next;
    this.pendingStep = null;
    this.latestResolvedLocal = null;
    this.ignoreResultsBeforeRequestId = this.nextRequestId;

    if (this.isReady) {
      this.postMessage({
        type: "sync",
        local: next,
      });
      this.pendingSync = null;
    }
  }

  step(nextStep: PhysicsStepInput): void {
    this.pendingStep = cloneStepInput(nextStep);
    this.flushStep();
  }

  consumeResolvedLocal(): PhysicsBallState | null {
    const result = this.latestResolvedLocal;
    this.latestResolvedLocal = null;
    return result;
  }

  private flushStep(): void {
    if (!this.isReady || this.isStepInFlight || !this.pendingStep) {
      return;
    }

    const requestId = this.nextRequestId;
    this.nextRequestId += 1;

    const step = this.pendingStep;
    this.pendingStep = null;
    this.isStepInFlight = true;

    this.postMessage({
      type: "step",
      requestId,
      ...step,
    });
  }

  private readonly onMessage = (event: MessageEvent<PhysicsWorkerResponse>): void => {
    const message = event.data;
    if (!message) {
      return;
    }

    if (message.type === "ready") {
      this.isReady = true;
      if (this.pendingSync) {
        this.postMessage({
          type: "sync",
          local: this.pendingSync,
        });
        this.pendingSync = null;
      }
      this.flushStep();
      return;
    }

    if (message.type !== "step:result") {
      return;
    }

    this.isStepInFlight = false;
    if (message.requestId < this.ignoreResultsBeforeRequestId) {
      this.flushStep();
      return;
    }

    this.latestResolvedLocal = message.local;
    this.flushStep();
  };

  private postMessage(message: PhysicsWorkerRequest): void {
    this.worker.postMessage(message);
  }
}

export interface PhysicsBallState {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsStepInput {
  dt: number;
  current: PhysicsBallState;
  target: PhysicsBallState;
  remotes: PhysicsBallState[];
}

export type PhysicsWorkerRequest =
  | {
      type: "init";
      ballRadius: number;
    }
  | {
      type: "sync";
      local: PhysicsBallState;
    }
  | ({
      type: "step";
      requestId: number;
    } & PhysicsStepInput);

export type PhysicsWorkerResponse =
  | {
      type: "ready";
    }
  | {
      type: "step:result";
      requestId: number;
      local: PhysicsBallState;
    };

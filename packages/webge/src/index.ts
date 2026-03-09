import initWebgeWasm, { WebgeEngine as WasmWebgeEngine } from "../pkg/webge.js";

export interface WebgeConfig {
  ballRadius: number;
  moveSpeed: number;
  orbitSpeed: number;
  jumpVelocity: number;
  gravity: number;
  packetCapacity: number;
  playerStartX: number;
  playerStartY: number;
  playerStartZ: number;
  playerStartYaw: number;
}

export interface WebgeLocalPlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface WebgeRemotePlayerState {
  x: number;
  y: number;
  z: number;
}

export interface WebgeMoveInputPacket {
  horizontal: number;
  vertical: number;
  orbit_delta: number;
  jump_pressed: boolean;
}

export type WebgePacket =
  | {
      type: "sync_local";
      player: WebgeLocalPlayerState;
      reset_vertical_velocity: boolean;
    }
  | {
      type: "local_input";
      input: WebgeMoveInputPacket;
    }
  | {
      type: "remote_snapshot";
      players: WebgeRemotePlayerState[];
    };

export interface WebgePacketStats {
  capacity: number;
  queued: number;
  dropped: number;
}

export interface WebgeStepResult {
  player: WebgeLocalPlayerState;
}

type WasmEngineStepResult = {
  player: WebgeLocalPlayerState;
};

type WasmEnginePacketStats = {
  capacity: number;
  queued: number;
  dropped: number;
};

let wasmInitPromise: Promise<unknown> | null = null;

function ensureWasmInitialized(): Promise<void> {
  if (!wasmInitPromise) {
    wasmInitPromise = initWebgeWasm();
  }

  return wasmInitPromise.then(() => undefined);
}

export class WebgeEngine {
  private constructor(private readonly engine: WasmWebgeEngine) {}

  static async create(config: WebgeConfig): Promise<WebgeEngine> {
    await ensureWasmInitialized();

    return new WebgeEngine(
      new WasmWebgeEngine({
        ball_radius: config.ballRadius,
        move_speed: config.moveSpeed,
        orbit_speed: config.orbitSpeed,
        jump_velocity: config.jumpVelocity,
        gravity: config.gravity,
        packet_capacity: config.packetCapacity,
        player_start_x: config.playerStartX,
        player_start_y: config.playerStartY,
        player_start_z: config.playerStartZ,
        player_start_yaw: config.playerStartYaw,
      }),
    );
  }

  enqueuePacket(packet: WebgePacket): void {
    this.engine.enqueue_packet(packet);
  }

  clearPackets(): void {
    this.engine.clear_packets();
  }

  dispose(): void {
    this.engine.free();
  }

  packetStats(): WebgePacketStats {
    return this.engine.packet_stats() as WasmEnginePacketStats;
  }

  snapshot(): WebgeStepResult {
    return this.engine.snapshot() as WasmEngineStepResult;
  }

  step(dtSeconds: number): WebgeStepResult {
    return this.engine.step(dtSeconds) as WasmEngineStepResult;
  }
}

const RING_READ_INDEX_OFFSET = 0;
const RING_WRITE_INDEX_OFFSET = 4;
const RING_CAPACITY_OFFSET = 8;
const RING_STRIDE_OFFSET = 12;
const RING_DATA_PTR_OFFSET = 16;
const RING_HEADER_BYTES = 20;

const PACKET_SYNC_LOCAL = 1;
const PACKET_CLEAR_REMOTES = 2;
const PACKET_PUSH_REMOTE = 3;

const INPUT_SET_MOVE = 1;
const RENDER_SPHERE_STRIDE_BYTES = 20;

interface RuntimeExports {
  memory: WebAssembly.Memory;
  webge_runtime_init: (
    ballRadius: number,
    moveSpeed: number,
    orbitSpeed: number,
    jumpVelocity: number,
    gravity: number,
    playerStartX: number,
    playerStartY: number,
    playerStartZ: number,
    playerStartYaw: number,
  ) => number;
  webge_runtime_packet_ring_header_ptr: () => number;
  webge_runtime_input_ring_header_ptr: () => number;
  webge_runtime_player_state_ptr: () => number;
  webge_runtime_render_sphere_count: () => number;
  webge_runtime_render_spheres_ptr: () => number;
  webge_runtime_step: (dtSeconds: number) => void;
}

interface RuntimeConfig {
  ballRadius: number;
  moveSpeed: number;
  orbitSpeed: number;
  jumpVelocity: number;
  gravity: number;
  playerStartX: number;
  playerStartY: number;
  playerStartZ: number;
  playerStartYaw: number;
}

export interface RuntimePlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface RuntimeSphereState {
  x: number;
  y: number;
  z: number;
  radius: number;
  kind: number;
}

export interface RuntimeInput {
  horizontal: number;
  vertical: number;
  orbitDelta: number;
  jumpPressed: boolean;
}

class SharedRingWriter {
  private memoryView: DataView;
  private headerView: DataView;

  constructor(
    private readonly memory: WebAssembly.Memory,
    private readonly headerPtr: number,
  ) {
    this.memoryView = new DataView(this.memory.buffer);
    this.headerView = new DataView(this.memory.buffer, this.headerPtr, RING_HEADER_BYTES);
  }

  push(write: (view: DataView, slotOffset: number) => void): void {
    this.refreshViews();

    const readIndex = this.headerView.getUint32(RING_READ_INDEX_OFFSET, true);
    const writeIndex = this.headerView.getUint32(RING_WRITE_INDEX_OFFSET, true);
    const capacity = this.headerView.getUint32(RING_CAPACITY_OFFSET, true);
    const stride = this.headerView.getUint32(RING_STRIDE_OFFSET, true);
    const dataPtr = this.headerView.getUint32(RING_DATA_PTR_OFFSET, true);

    if (capacity < 2 || stride < 1) {
      return;
    }

    const nextWriteIndex = (writeIndex + 1) % capacity;
    if (nextWriteIndex === readIndex) {
      this.headerView.setUint32(RING_READ_INDEX_OFFSET, (readIndex + 1) % capacity, true);
    }

    const slotOffset = dataPtr + writeIndex * stride;
    new Uint8Array(this.memory.buffer, slotOffset, stride).fill(0);
    this.refreshViews();
    write(this.memoryView, slotOffset);

    this.headerView.setUint32(RING_WRITE_INDEX_OFFSET, nextWriteIndex, true);
  }

  private refreshViews(): void {
    if (this.memoryView.buffer === this.memory.buffer) {
      return;
    }

    this.memoryView = new DataView(this.memory.buffer);
    this.headerView = new DataView(this.memory.buffer, this.headerPtr, RING_HEADER_BYTES);
  }
}

async function instantiateRuntimeWasm(): Promise<RuntimeExports> {
  const wasmUrl = new URL("./wasm/webge_runtime.wasm", import.meta.url);
  const bytes = await fetch(wasmUrl).then((response) => response.arrayBuffer());
  const instance = await WebAssembly.instantiate(bytes, {});
  return instance.instance.exports as unknown as RuntimeExports;
}

export class EngineRuntime {
  private memoryView: DataView;

  private constructor(
    private readonly exports: RuntimeExports,
    private readonly packetRing: SharedRingWriter,
    private readonly inputRing: SharedRingWriter,
    private readonly playerStatePtr: number,
  ) {
    this.memoryView = new DataView(this.exports.memory.buffer);
  }

  static async create(config: RuntimeConfig): Promise<EngineRuntime> {
    const exports = await instantiateRuntimeWasm();
    const ok = exports.webge_runtime_init(
      config.ballRadius,
      config.moveSpeed,
      config.orbitSpeed,
      config.jumpVelocity,
      config.gravity,
      config.playerStartX,
      config.playerStartY,
      config.playerStartZ,
      config.playerStartYaw,
    );

    if (ok === 0) {
      throw new Error("Failed to initialize webge runtime.");
    }

    return new EngineRuntime(
      exports,
      new SharedRingWriter(exports.memory, exports.webge_runtime_packet_ring_header_ptr()),
      new SharedRingWriter(exports.memory, exports.webge_runtime_input_ring_header_ptr()),
      exports.webge_runtime_player_state_ptr(),
    );
  }

  dispose(): void {}

  syncLocal(player: RuntimePlayerState, resetVelocity: boolean): void {
    this.packetRing.push((view, offset) => {
      view.setUint32(offset, PACKET_SYNC_LOCAL, true);
      view.setFloat32(offset + 4, player.x, true);
      view.setFloat32(offset + 8, player.y, true);
      view.setFloat32(offset + 12, player.z, true);
      view.setFloat32(offset + 16, player.yaw, true);
      view.setUint32(offset + 20, resetVelocity ? 1 : 0, true);
    });
  }

  setRemotePlayers(players: readonly Pick<RuntimePlayerState, "x" | "y" | "z">[]): void {
    this.packetRing.push((view, offset) => {
      view.setUint32(offset, PACKET_CLEAR_REMOTES, true);
    });

    for (const player of players) {
      this.packetRing.push((view, offset) => {
        view.setUint32(offset, PACKET_PUSH_REMOTE, true);
        view.setFloat32(offset + 4, player.x, true);
        view.setFloat32(offset + 8, player.y, true);
        view.setFloat32(offset + 12, player.z, true);
      });
    }
  }

  setInput(input: RuntimeInput): void {
    this.inputRing.push((view, offset) => {
      view.setUint32(offset, INPUT_SET_MOVE, true);
      view.setFloat32(offset + 4, input.horizontal, true);
      view.setFloat32(offset + 8, input.vertical, true);
      view.setFloat32(offset + 12, input.orbitDelta, true);
      view.setUint32(offset + 16, input.jumpPressed ? 1 : 0, true);
    });
  }

  step(dtSeconds: number): { player: RuntimePlayerState; spheres: RuntimeSphereState[] } {
    this.exports.webge_runtime_step(dtSeconds);
    this.refreshStateView();

    const player: RuntimePlayerState = {
      x: this.memoryView.getFloat32(this.playerStatePtr, true),
      y: this.memoryView.getFloat32(this.playerStatePtr + 4, true),
      z: this.memoryView.getFloat32(this.playerStatePtr + 8, true),
      yaw: this.memoryView.getFloat32(this.playerStatePtr + 12, true),
    };

    const spheresPtr = this.exports.webge_runtime_render_spheres_ptr();
    const sphereCount = this.exports.webge_runtime_render_sphere_count();
    const spheres: RuntimeSphereState[] = [];

    for (let index = 0; index < sphereCount; index += 1) {
      const offset = spheresPtr + index * RENDER_SPHERE_STRIDE_BYTES;
      spheres.push({
        x: this.memoryView.getFloat32(offset, true),
        y: this.memoryView.getFloat32(offset + 4, true),
        z: this.memoryView.getFloat32(offset + 8, true),
        radius: this.memoryView.getFloat32(offset + 12, true),
        kind: this.memoryView.getUint32(offset + 16, true),
      });
    }

    return { player, spheres };
  }

  private refreshStateView(): void {
    if (this.memoryView.buffer === this.exports.memory.buffer) {
      return;
    }

    this.memoryView = new DataView(this.exports.memory.buffer);
  }
}

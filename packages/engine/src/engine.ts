import { createCamera, type Camera } from "./camera";
import {
  createBallGeometry,
  createBoxGeometry,
  createTubeGeometry,
} from "./geometry";
import {
  createBallSolid,
  createBoxSolid,
  createTubeSolid,
  type Ball,
  type BallOptions,
  type Box,
  type BoxOptions,
  type Solid,
  type Tube,
  type TubeOptions,
} from "./solids";

export class Engine {
  camera: Camera;
  #solids: Solid[];

  constructor() {
    this.camera = createCamera();
    this.#solids = [];
  }

  get solids(): readonly Solid[] {
    return this.#solids;
  }

  createBox(options: BoxOptions): Box {
    const solid = createBoxSolid(
      options,
      createBoxGeometry({
        width: options.width,
        height: options.height,
        depth: options.depth,
      }),
    );
    this.#solids.push(solid);
    return solid;
  }

  createTube(options: TubeOptions): Tube {
    const solid = createTubeSolid(
      options,
      createTubeGeometry({
        radius: options.radius,
        height: options.height,
        segments: options.segments ?? 24,
      }),
    );
    this.#solids.push(solid);
    return solid;
  }

  createBall(options: BallOptions): Ball {
    const solid = createBallSolid(
      options,
      createBallGeometry({
        radius: options.radius,
        segments: options.segments ?? 20,
        rings: options.rings ?? 14,
      }),
    );
    this.#solids.push(solid);
    return solid;
  }

  destroy(): void {
    this.#solids.length = 0;
  }
}

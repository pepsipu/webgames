import { createCamera, type Camera } from "./camera";
import { Renderer } from "./renderer";
import {
  createBallGeometry,
  createBoxGeometry,
  createTubeGeometry,
} from "./geometry";
import {
  createBallSolid,
  createBoxSolid,
  createTubeSolid,
  destroySolid,
  type BallOptions,
  type BallSolid,
  type BoxOptions,
  type BoxSolid,
  type Solid,
  type TubeOptions,
  type TubeSolid,
} from "./solids";

export class Engine {
  camera: Camera;
  #renderer: Renderer;
  #solids: Solid[];

  private constructor(renderer: Renderer) {
    this.camera = createCamera();
    this.#renderer = renderer;
    this.#solids = [];
  }

  static async create(canvas: HTMLCanvasElement): Promise<Engine> {
    const renderer = await Renderer.create(canvas);
    return new Engine(renderer);
  }

  createBox(options: BoxOptions): BoxSolid {
    const geometry = createBoxGeometry({
      width: options.width,
      height: options.height,
      depth: options.depth,
    });
    const resources = this.#renderer.createGpuResources(geometry);
    const solid = createBoxSolid(options, resources);
    this.#solids.push(solid);
    return solid;
  }

  createTube(options: TubeOptions): TubeSolid {
    const geometry = createTubeGeometry({
      radius: options.radius,
      height: options.height,
      segments: options.segments ?? 24,
    });
    const resources = this.#renderer.createGpuResources(geometry);
    const solid = createTubeSolid(options, resources);
    this.#solids.push(solid);
    return solid;
  }

  createBall(options: BallOptions): BallSolid {
    const geometry = createBallGeometry({
      radius: options.radius,
      segments: options.segments ?? 20,
      rings: options.rings ?? 14,
    });
    const resources = this.#renderer.createGpuResources(geometry);
    const solid = createBallSolid(options, resources);
    this.#solids.push(solid);
    return solid;
  }

  render(): void {
    this.#renderer.render(this.camera, this.#solids);
  }

  destroy(): void {
    for (const solid of this.#solids) {
      destroySolid(solid);
    }

    this.#solids.length = 0;
    this.#renderer.destroy();
  }
}

import { Renderer } from "./renderer";
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
  #renderer: Renderer;
  #solids: Solid[];

  private constructor(renderer: Renderer) {
    this.#renderer = renderer;
    this.#solids = [];
  }

  static async create(canvas: HTMLCanvasElement): Promise<Engine> {
    const renderer = await Renderer.create(canvas);
    return new Engine(renderer);
  }

  createBox(options: BoxOptions): BoxSolid {
    const solid = createBoxSolid(this.#renderer.device, options);
    this.#solids.push(solid);
    return solid;
  }

  createTube(options: TubeOptions): TubeSolid {
    const solid = createTubeSolid(this.#renderer.device, options);
    this.#solids.push(solid);
    return solid;
  }

  createBall(options: BallOptions): BallSolid {
    const solid = createBallSolid(this.#renderer.device, options);
    this.#solids.push(solid);
    return solid;
  }

  render(): void {
    this.#renderer.render(this.#solids);
  }

  destroy(): void {
    for (const solid of this.#solids) {
      destroySolid(solid);
    }

    this.#solids.length = 0;
    this.#renderer.destroy();
  }
}

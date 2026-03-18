import { Engine } from "@webgame/engine";
import { loadGameFile } from "@webgame/parser";
import { Renderer } from "@webgame/renderer";
import { KeyboardInput } from "./input";

export class Client {
  readonly engine: Engine;
  readonly input: KeyboardInput;
  readonly renderer: Renderer;

  private constructor(
    engine: Engine,
    input: KeyboardInput,
    renderer: Renderer,
  ) {
    this.engine = engine;
    this.input = input;
    this.renderer = renderer;
  }

  static async create(canvas: HTMLCanvasElement): Promise<Client> {
    initializeCanvasSize(canvas);

    const engine = await Engine.create();
    const renderer = await Renderer.create(engine, canvas);
    const input = new KeyboardInput(engine.inputService);

    return new Client(engine, input, renderer);
  }

  load(text: string): void {
    loadGameFile(this.engine, text);
  }

  tick(deltaTime: number): void {
    this.engine.tick(deltaTime);
    this.renderer.render();
  }

  destroy(): void {
    this.input.destroy();
    this.renderer.destroy();
    this.engine.destroy();
  }
}

function initializeCanvasSize(canvas: HTMLCanvasElement): void {
  const canvasRect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio;
  const width = Math.floor(canvasRect.width * pixelRatio);
  const height = Math.floor(canvasRect.height * pixelRatio);

  canvas.width = width;
  canvas.height = height;
}

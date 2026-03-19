import { Engine, inputSystem, scriptSystem } from "@webgame/engine";
import { loadGameFile } from "@webgame/parser";
import { Renderer } from "@webgame/renderer";

export class Client {
  private engine: Engine;
  private readonly renderer: Renderer;

  private constructor(engine: Engine, renderer: Renderer) {
    this.engine = engine;
    this.renderer = renderer;
  }

  static async create(canvas: HTMLCanvasElement): Promise<Client> {
    initializeCanvasSize(canvas);

    const engine = new Engine([inputSystem, scriptSystem]);
    const renderer = await Renderer.create(engine, canvas);

    return new Client(engine, renderer);
  }

  tick(deltaTime: number): void {
    this.engine.tick(deltaTime);
    this.renderer.render();
  }

  load(text: string): void {
    const nextEngine = new Engine([inputSystem, scriptSystem]);

    try {
      loadGameFile(nextEngine, text);
    } catch (error) {
      nextEngine.destroy();
      throw error;
    }

    const previousEngine = this.engine;
    this.engine = nextEngine;
    this.renderer.setEngine(nextEngine);
    previousEngine.destroy();
  }

  destroy(): void {
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

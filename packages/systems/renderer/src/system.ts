import type { EngineSystem } from "@webgame/engine";
import { Renderer } from "./renderer";

export async function createRendererSystem(
  canvas: HTMLCanvasElement,
): Promise<EngineSystem> {
  const renderer = await Renderer.create(canvas);

  return {
    install(engine) {
      engine.tickHandlers.push(() => {
        renderer.render(engine.document);
      });
      engine.destroyHandlers.push(() => {
        renderer.destroy();
      });
    },
  };
}

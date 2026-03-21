import type { EngineSystem } from "@webgame/engine";
import { UiOverlay } from "./dom";

export function createUiSystem(root: HTMLDivElement): EngineSystem {
  const overlay = new UiOverlay(root);

  return {
    install(engine) {
      engine.tickHandlers.push((engine) => {
        overlay.render(engine.document);
      });
      engine.afterTickHandlers.push(() => {
        overlay.clearFrame();
      });
      engine.destroyHandlers.push(() => {
        overlay.destroy();
      });
    },
  };
}

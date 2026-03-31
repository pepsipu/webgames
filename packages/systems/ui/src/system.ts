import type { EngineSystem } from "@webgames/engine";
import { UiOverlay } from "./dom";
import { ButtonElement } from "./elements/button";
import { ParagraphElement } from "./elements/paragraph";

export function createUiSystem(root: HTMLDivElement): EngineSystem {
  const overlay = new UiOverlay(root);

  return {
    install(engine) {
      engine.registry.register(ButtonElement, ParagraphElement);
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

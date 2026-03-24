import { createInputService } from "./components/input";
import type { EngineSystem } from "@webgames/engine";

export const inputSystem: EngineSystem = {
  install(engine) {
    const inputService = createInputService();
    engine.document.append(inputService);

    const onKeyDown = (event: KeyboardEvent): void => {
      inputService.pressKey(event.code);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      inputService.releaseKey(event.code);
    };
    const onBlur = (): void => {
      inputService.reset();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    engine.afterTickHandlers.push(() => {
      inputService.clearFrame();
    });
    engine.destroyHandlers.push(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      inputService.reset();
    });
  },
};

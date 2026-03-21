import {
  clearInputFrame,
  createInputService,
  pressKey,
  releaseKey,
  resetInput,
} from "./components/input";
import type { EngineSystem } from "@webgame/engine";

export const inputSystem: EngineSystem = {
  install(engine) {
    const inputService = createInputService();
    engine.document.append(inputService);

    const onKeyDown = (event: KeyboardEvent): void => {
      pressKey(inputService, event.code);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      releaseKey(inputService, event.code);
    };
    const onBlur = (): void => {
      resetInput(inputService);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    engine.afterTickHandlers.push(() => {
      clearInputFrame(inputService);
    });
    engine.destroyHandlers.push(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      resetInput(inputService);
    });
  },
};

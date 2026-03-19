import {
  createScriptService,
  destroyScriptService,
  tickScriptService,
} from "./service";
import type { EngineSystem } from "@webgame/engine";

export const scriptSystem: EngineSystem = {
  install(engine) {
    const scriptService = engine.addNode(createScriptService());

    engine.tickHandlers.push((deltaTime) => {
      tickScriptService(scriptService, deltaTime);
    });
    engine.destroyHandlers.push(() => {
      destroyScriptService(scriptService);
    });
  },
};

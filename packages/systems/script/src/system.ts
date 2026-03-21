import {
  createScriptService,
  destroyScriptService,
  tickScriptService,
} from "./service";
import type { EngineSystem } from "@webgame/engine";

export const scriptSystem: EngineSystem = {
  install(engine) {
    const scriptService = createScriptService();
    engine.document.append(scriptService);

    engine.tickHandlers.push((engine, deltaTime) => {
      tickScriptService(scriptService, engine, deltaTime);
    });
    engine.destroyHandlers.push(() => {
      destroyScriptService(scriptService);
    });
  },
};

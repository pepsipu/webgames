import {
  createScriptService,
  destroyScriptService,
  tickScriptService,
} from "../components/script/service";
import type { EngineSystem } from "../engine";

export const scriptSystem: EngineSystem = {
  async install(engine) {
    const scriptService = engine.addNode(await createScriptService());

    engine.tickHandlers.push((deltaTime) => {
      tickScriptService(scriptService, deltaTime);
    });
    engine.destroyHandlers.push(() => {
      destroyScriptService(scriptService);
    });
  },
};

import type { EngineSystem } from "@webgame/engine";
import {
  applyPendingClientNetworkSnapshot,
  createClientNetworkService,
} from "./client";

export const clientNetworkSystem: EngineSystem = {
  install(engine) {
    const networkService = createClientNetworkService(engine.document);
    engine.document.append(networkService);

    engine.tickHandlers.push((engine) => {
      applyPendingClientNetworkSnapshot(engine.document);
    });
    engine.destroyHandlers.push(() => {
      networkService.destroyed = true;
      networkService.socket.close();
    });
  },
};

import type { EngineSystem } from "@webgame/engine";
import {
  applyPendingClientNetworkSnapshot,
  createClientNetworkService,
} from "./client";

export const clientNetworkSystem: EngineSystem = {
  install(engine) {
    const networkService = engine.addNode(createClientNetworkService());

    engine.tickHandlers.push(() => {
      applyPendingClientNetworkSnapshot(networkService);
    });
    engine.destroyHandlers.push(() => {
      networkService.network.destroyed = true;
      networkService.network.socket.close();
    });
  },
};

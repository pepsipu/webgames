import {
  applyPendingClientNetworkSnapshot,
  createClientNetworkService,
} from "../components/network/client";
import {
  broadcastServerNetworkSnapshot,
  createServerNetworkService,
} from "../components/network/server";
import type { EngineSystem } from "../engine";

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

export const serverNetworkSystem: EngineSystem = {
  install(engine) {
    const networkService = engine.addNode(createServerNetworkService());

    engine.afterTickHandlers.push(() => {
      broadcastServerNetworkSnapshot(networkService);
    });
  },
};

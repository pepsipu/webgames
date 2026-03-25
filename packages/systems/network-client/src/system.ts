import type { EngineSystem } from "@webgames/engine";
import { ClientNetworkServiceElement } from "./client";

export const clientNetworkSystem: EngineSystem = {
  install(engine) {
    const networkService = new ClientNetworkServiceElement(engine.document);
    engine.document.append(networkService);

    engine.tickHandlers.push(() => {
      networkService.applyPendingSnapshot(engine.document);
    });
    engine.destroyHandlers.push(() => {
      networkService.destroy();
    });
  },
};

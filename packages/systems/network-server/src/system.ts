import type { Server as HttpServer } from "node:http";
import type { EngineSystem } from "@webgames/engine";
import { ServerNetworkServiceElement } from "./server";

export function serverNetworkSystem(server: HttpServer): EngineSystem {
  return {
    install(engine) {
      engine.registry.register(ServerNetworkServiceElement);
      const networkService = new ServerNetworkServiceElement();

      networkService.attach(server, engine.registry, engine.document);
      engine.document.append(networkService);

      engine.afterTickHandlers.push(() => {
        networkService.broadcastSnapshot(engine.registry, engine.document);
      });
      engine.destroyHandlers.push(() => {
        networkService.destroy();
      });
    },
  };
}

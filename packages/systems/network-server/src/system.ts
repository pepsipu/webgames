import type { Server as HttpServer } from "node:http";
import type { EngineSystem } from "@webgame/engine";
import {
  broadcastServerNetworkSnapshot,
  createServerNetworkService,
  createServerNetworkSocketServer,
  disconnectServerNetworkClients,
} from "./server";

export function serverNetworkSystem(server: HttpServer): EngineSystem {
  return {
    install(engine) {
      const networkService = engine.addNode(createServerNetworkService());
      const socketServer = createServerNetworkSocketServer(server, networkService);

      engine.afterTickHandlers.push(() => {
        broadcastServerNetworkSnapshot(networkService);
      });
      engine.destroyHandlers.push(() => {
        disconnectServerNetworkClients(networkService);
        socketServer.close();
      });
    },
  };
}

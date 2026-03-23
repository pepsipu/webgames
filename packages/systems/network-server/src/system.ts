import type { Server as HttpServer } from "node:http";
import type { EngineSystem } from "@webgames/engine";
import {
  broadcastServerNetworkSnapshot,
  createServerNetworkService,
  createServerNetworkSocketServer,
  disconnectServerNetworkClients,
  getServerNetworkService,
} from "./server";

export function serverNetworkSystem(server: HttpServer): EngineSystem {
  return {
    install(engine) {
      engine.document.append(createServerNetworkService());
      const socketServer = createServerNetworkSocketServer(
        server,
        engine.document,
        getServerNetworkService(engine.document),
      );

      engine.afterTickHandlers.push((engine) => {
        broadcastServerNetworkSnapshot(engine.document);
      });
      engine.destroyHandlers.push((engine) => {
        disconnectServerNetworkClients(engine.document);
        socketServer.close();
      });
    },
  };
}

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import {
  bindServerNetworkSocketServer,
  disconnectServerNetworkClients,
  Engine,
  serverNetworkSystem,
  scriptSystem,
} from "@webgame/engine";
import { loadGameFile } from "@webgame/parser";
import { Hono } from "hono";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT ?? 8787);
const defaultGameFileText = await readFile(
  new URL("../../client/src/default.game.xml", import.meta.url),
  "utf8",
);
let engine = loadServerEngine(defaultGameFileText);
const app = new Hono();

app.put("/api/gamefile", async (context) => {
  const text = await context.req.text();

  try {
    const nextEngine = loadServerEngine(text);

    disconnectServerNetworkClients(engine.scene);
    engine.destroy();
    engine = nextEngine;
  } catch (error) {
    return context.text(
      error instanceof Error ? error.message : String(error),
      400,
    );
  }

  return context.body(null, 204);
});

const server = createServer(getRequestListener(app.fetch));
// TODO: move websocket server creation into server network system so this is handled inside the engine
const webSocketServer = new WebSocketServer({
  server,
  path: "/ws",
});

bindServerNetworkSocketServer(() => {
  return engine.scene;
}, webSocketServer);

server.listen(port, () => {
  console.log(`Server listening on http://127.0.0.1:${port}`);
});

let previousTime = performance.now();
setInterval(() => {
  const now = performance.now();
  const deltaTime = (now - previousTime) * 0.001;
  previousTime = now;

  engine.tick(deltaTime);
}, 1000 / 60);

function loadServerEngine(text: string): Engine {
  const engine = new Engine([scriptSystem, serverNetworkSystem]);
  try {
    loadGameFile(engine, text);
    return engine;
  } catch (error) {
    engine.destroy();
    throw error;
  }
}

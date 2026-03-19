import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import { Engine } from "@webgame/engine";
import { serverNetworkSystem } from "@webgame/network-server";
import { loadGameFile } from "@webgame/parser";
import { scriptSystem } from "@webgame/script";
import { Hono } from "hono";

const port = Number(process.env.PORT ?? 8787);
const defaultGameFileText = await readFile(
  new URL("../../client/src/default.game.xml", import.meta.url),
  "utf8",
);
const app = new Hono();
const server = createServer(getRequestListener(app.fetch));
let engine: Engine | null = loadServerEngine(defaultGameFileText);

app.put("/api/gamefile", async (context) => {
  const text = await context.req.text();

  engine?.destroy();
  engine = null;

  try {
    engine = loadServerEngine(text);
  } catch (error) {
    return context.text(
      error instanceof Error ? error.message : String(error),
      400,
    );
  }

  return context.body(null, 204);
});

server.listen(port, () => {
  console.log(`Server listening on http://127.0.0.1:${port}`);
});

let previousTime = performance.now();
setInterval(() => {
  const now = performance.now();
  const deltaTime = (now - previousTime) * 0.001;
  previousTime = now;

  engine?.tick(deltaTime);
}, 1000 / 60);

function loadServerEngine(text: string): Engine {
  const engine = new Engine([scriptSystem, serverNetworkSystem(server)]);
  try {
    loadGameFile(engine, text);
    return engine;
  } catch (error) {
    engine.destroy();
    throw error;
  }
}

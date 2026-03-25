import swc from "@rollup/plugin-swc";
import { defineConfig, withFilter } from "vite";
import wasm from "vite-plugin-wasm";

const clientPort = 5173;
const allowedHosts = ["webgame.pepsi.pw"];
const serverUrl = process.env.WEBGAMES_SERVER_URL ?? "http://127.0.0.1:8787";
const proxy = {
  "/api": {
    target: serverUrl,
  },
  "/ws": {
    target: serverUrl,
    ws: true,
  },
};

export default defineConfig({
  plugins: [
    withFilter(
      swc({
        swc: {
          jsc: {
            parser: {
              syntax: "typescript",
              decorators: true,
            },
            transform: {
              // @ts-expect-error The released @swc/types union lags runtime support for 2023-11.
              decoratorVersion: "2023-11",
            },
          },
        },
      }),
      { transform: { code: "@" } },
    ),
    wasm(),
  ],
  server: {
    port: clientPort,
    allowedHosts,
    proxy,
  },
  preview: {
    port: clientPort,
    allowedHosts,
    proxy,
  },
});

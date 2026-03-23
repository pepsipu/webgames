import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

const clientPort = 5173;
const allowedHosts = ["webgames.pepsi.pw"];
const proxy = {
  "/api": {
    target: "http://127.0.0.1:8787",
  },
  "/ws": {
    target: "http://127.0.0.1:8787",
    ws: true,
  },
};

export default defineConfig({
  plugins: [wasm()],
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

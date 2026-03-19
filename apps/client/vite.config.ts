import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm()],
  server: {
    allowedHosts: ["webgame.pepsi.pw"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
      },
      "/ws": {
        target: "http://127.0.0.1:8787",
        ws: true,
      },
    },
  },
});

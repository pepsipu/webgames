import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

const benchmarkPort = 4173;

export default defineConfig({
  plugins: [wasm()],
  server: {
    port: benchmarkPort,
  },
  preview: {
    port: benchmarkPort,
  },
});

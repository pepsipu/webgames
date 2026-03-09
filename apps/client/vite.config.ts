import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/ws": {
        target: "ws://localhost:8787",
        ws: true,
      },
    },
    allowedHosts: [
      "nam-memorabilia-fellow-manitoba.trycloudflare.com",
      "statute-scroll-certificates-beginners.trycloudflare.com",
    ],
  },
});

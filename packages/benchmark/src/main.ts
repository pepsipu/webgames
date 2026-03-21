import { runClientBenchmark } from "./client";

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("App element not found");
}

await runClientBenchmark(app);

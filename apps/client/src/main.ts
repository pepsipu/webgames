import { Engine } from "@webgame/engine";
import { inputSystem } from "@webgame/input";
import { clientNetworkSystem } from "@webgame/network-client";
import { createRendererSystem } from "@webgame/renderer";
import { scriptSystem } from "@webgame/script";
import defaultGameFile from "./default.game.xml?raw";
import { uploadGameFile } from "./gamefile";

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("App element not found");
}

const textarea = document.createElement("textarea");
textarea.id = "gamefile-input";
textarea.rows = 48;
textarea.cols = 48;
textarea.value = defaultGameFile;

const canvas = document.createElement("canvas");
canvas.id = "canvas";

app.append(textarea, canvas);

initializeCanvasSize(canvas);

const engine = new Engine([
  inputSystem,
  clientNetworkSystem,
  scriptSystem,
  await createRendererSystem(canvas),
]);

textarea.addEventListener("input", () => {
  void uploadGameFile(textarea.value);
});

let previousSeconds = 0;
requestAnimationFrame(function frame(time) {
  const seconds = time * 0.001;
  const deltaTime = previousSeconds === 0 ? 0 : seconds - previousSeconds;
  previousSeconds = seconds;

  engine.tick(deltaTime);
  requestAnimationFrame(frame);
});

function initializeCanvasSize(canvas: HTMLCanvasElement): void {
  const canvasRect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio;

  canvas.width = Math.floor(canvasRect.width * pixelRatio);
  canvas.height = Math.floor(canvasRect.height * pixelRatio);
}

import { Engine } from "@webgames/engine";
import { inputSystem } from "@webgames/input";
import { clientNetworkSystem } from "@webgames/network-client";
import { createRendererSystem } from "@webgames/renderer";
import { scriptSystem } from "@webgames/script";
import { createUiSystem } from "@webgames/ui";
import { createEditor } from "./editor";

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("App element not found");
}

const editor = createEditor();

const canvas = document.createElement("canvas");
canvas.id = "canvas";

const uiOverlay = document.createElement("div");
uiOverlay.id = "ui-overlay";

app.append(editor, canvas, uiOverlay);

initializeCanvasSize(canvas);

const engine = new Engine([
  inputSystem,
  clientNetworkSystem,
  scriptSystem,
  createUiSystem(uiOverlay),
  await createRendererSystem(canvas),
]);

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

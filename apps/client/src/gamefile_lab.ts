import { Engine } from "@webgame/engine";
import { loadGameFile } from "@webgame/parser";
import { Renderer } from "@webgame/renderer";

// http://localhost:5173/src/gamefile_lab.html

const textarea = document.querySelector<HTMLTextAreaElement>("#gamefile")!;
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;

const canvasRect = canvas.getBoundingClientRect();
const pixelRatio = window.devicePixelRatio;
const width = Math.floor(canvasRect.width * pixelRatio);
const height = Math.floor(canvasRect.height * pixelRatio);

canvas.width = width;
canvas.height = height;

if (!textarea || !canvas) {
  throw new Error("Gamefile lab page is missing required elements.");
}

let engine: Engine | null = null;
let renderer: Renderer | null = null;
let previousSeconds = 0;
let loading = false;

function destroyRuntime(): void {
  renderer?.destroy();
  engine?.destroy();
  renderer = null;
  engine = null;
}

async function createRuntime(): Promise<void> {
  destroyRuntime();

  engine = new Engine();
  resizeCanvas(canvas);
  renderer = await Renderer.create(engine, canvas);
}

function resizeCanvas(target: HTMLCanvasElement): void {
  const rect = target.getBoundingClientRect();
  const ratio = window.devicePixelRatio;
  target.width = Math.max(1, Math.floor(rect.width * ratio));
  target.height = Math.max(1, Math.floor(rect.height * ratio));
}

async function launchFromInput(): Promise<void> {
  if (loading) {
    return;
  }

  loading = true;

  try {
    await createRuntime();
    await loadGameFile(engine!, textarea.value);
    previousSeconds = 0;
  } catch (error) {
    destroyRuntime();
    console.error("Failed to load gamefile:", error);
  } finally {
    loading = false;
  }
}

// when the user changes the input, load the gamefile and launch the game
textarea.addEventListener("input", () => {
  void launchFromInput();
});

requestAnimationFrame(function frame(time) {
  const seconds = time * 0.001;
  const deltaTime = previousSeconds === 0 ? 0 : seconds - previousSeconds;
  previousSeconds = seconds;

  if (engine && renderer) {
    try {
      engine.tick(deltaTime);
      renderer.render();
    } catch (error) {
      destroyRuntime();
      console.error("Runtime error in game loop:", error);
    }
  }

  requestAnimationFrame(frame);
});

window.addEventListener("resize", () => {
  if (!canvas) {
    return;
  }

  if (!engine) {
    resizeCanvas(canvas);
    return;
  }

  void launchFromInput();
});

void launchFromInput();

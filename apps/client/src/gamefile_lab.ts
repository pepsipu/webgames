import { Engine } from "@webgame/engine";
import { loadGameFile } from "@webgame/parser";
import { Renderer } from "@webgame/renderer";

// http://localhost:5173/src/gamefile_lab.html

const textarea = document.querySelector<HTMLTextAreaElement>("#gamefile")!;
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;

function initializeCanvasSize(): void {
  const canvasRect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio;
  const width = Math.floor(canvasRect.width * pixelRatio);
  const height = Math.floor(canvasRect.height * pixelRatio);

  canvas.width = width;
  canvas.height = height;
}

if (!textarea || !canvas) {
  throw new Error("Gamefile lab page is missing required elements.");
}

let engine: Engine | null = null;
let renderer: Renderer | null = null;
let previousSeconds = 0;
let loading = false;

function destroyRuntime(): void {
  const oldRenderer = renderer;
  const oldEngine = engine;

  renderer = null;
  engine = null;

  try {
    oldRenderer?.destroy();
  } catch (error) {
    console.warn("Renderer destroy failed:", error);
  }

  try {
    oldEngine?.destroy();
  } catch (error) {
    console.warn("Engine destroy failed:", error);
  }
}

async function createRuntime(): Promise<void> {
  destroyRuntime();

  initializeCanvasSize();
  engine = new Engine();
  renderer = await Renderer.create(engine, canvas);
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
    startFrameLoop();
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

function startFrameLoop(): void {
  requestAnimationFrame(function frame(time) {
    const seconds = time * 0.001;
    const deltaTime = previousSeconds === 0 ? 0 : seconds - previousSeconds;
    previousSeconds = seconds;

    if (!engine || !renderer) {
      requestAnimationFrame(frame);
      return; // stop animation loop
    }

    try {
      engine.tick(deltaTime);
      renderer.render();
    } catch (error) {
      destroyRuntime();
      console.error("Runtime error in game loop:", error);
    }

    requestAnimationFrame(frame);
  });
}

// launch the initial gamefile
await launchFromInput();

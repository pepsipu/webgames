import { Engine } from "@webgame/engine";
import { loadGameFile } from "@webgame/parser";
import { Renderer } from "@webgame/renderer";

const textarea = document.querySelector<HTMLTextAreaElement>("#gamefile")!;
const launchButton = document.querySelector<HTMLButtonElement>("#launch")!;
const statusLabel = document.querySelector<HTMLDivElement>("#status")!;
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;

if (!textarea || !launchButton || !statusLabel || !canvas) {
  throw new Error("Gamefile lab page is missing required elements.");
}

let engine: Engine | null = null;
let renderer: Renderer | null = null;
let previousSeconds = 0;
let loading = false;

async function createRuntime(): Promise<void> {
  renderer?.destroy();

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
  launchButton.disabled = true;
  statusLabel.textContent = "Loading gamefile...";

  try {
    await createRuntime();
    await loadGameFile(engine!, textarea.value);
    previousSeconds = 0;
    statusLabel.textContent = "Game loaded.";
  } catch (error) {
    statusLabel.textContent = `Load failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error("Failed to load gamefile:", error);
  } finally {
    launchButton.disabled = false;
    loading = false;
  }
}

// pressing tab adds indentation in text area
textarea.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") {
    return;
  }

  event.preventDefault();

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const indent = "  ";

  textarea.value = `${value.slice(0, start)}${indent}${value.slice(end)}`;
  textarea.selectionStart = start + indent.length;
  textarea.selectionEnd = start + indent.length;
});

launchButton.addEventListener("click", () => {
  void launchFromInput();
});

requestAnimationFrame(function frame(time) {
  const seconds = time * 0.001;
  const deltaTime = previousSeconds === 0 ? 0 : seconds - previousSeconds;
  previousSeconds = seconds;

  if (engine && renderer) {
    engine.tick(deltaTime);
    renderer.render();
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

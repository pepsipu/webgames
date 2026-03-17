import { Engine } from "@webgame/engine";
import { loadGameFile } from "@webgame/parser";
import { Renderer } from "@webgame/renderer";

const app = document.querySelector<HTMLDivElement>("#app")!;
// create the canvas and textarea
const textarea = document.createElement("textarea") as HTMLTextAreaElement;
textarea.id = "gamefile-input";
const canvas = document.createElement("canvas") as HTMLCanvasElement;
canvas.id = "canvas";
textarea.rows = 48;
textarea.cols = 48;
textarea.textContent = `<!-- demo of real game file -->
<game name="rotating ball tube box" author="maxster">

  <scene>
    <box id="box" position="0 0 0" width="0.9" height="0.9" depth="0.9">
        <tube id="boxJoint" position="0.65 0 0" radius="0.08" height="1.3" color="0.9 0.9 0.9"></tube>
        <tube id="tube" position="1.3 0 0" radius="0.45" height="1.1">
            <tube id="tubeJoint" position="0.55 0 0" radius="0.08" height="1.1" color="0.9 0.9 0.9"></tube>
            <ball id="ball" position="1.1 0 0" radius="0.45">
                <!-- tldr: a ball attached to a tube attached to a box lol -->
            </ball>
        </tube>
    </box>
  </scene>

  <ui>
    <!-- todo: implement ui. any unimplemented features are ignored for now -->
    <button id="toggle">awesome button</button>
  </ui>

  <script>
    // script for the engine. taken from example code
    let seconds = 0;
    const root = scene.root;
    const camera = root.children[0];
    const box = root.children[1];
    const boxJoint = box.children[0];
    const tube = box.children[1];
    const tubeJoint = tube.children[0];
    const ball = tube.children[1];

    boxJoint.transform.setRotationFromEuler(0, 0, -Math.PI * 0.5);
    tubeJoint.transform.setRotationFromEuler(0, 0, -Math.PI * 0.5);

    function animateColor(material, time, phase) {
      material.setColor(
        0.5 + 0.5 * Math.sin(time + phase),
        0.5 + 0.5 * Math.sin(time * 1.3 + phase + 2),
        0.5 + 0.5 * Math.sin(time * 0.7 + phase + 4),
      );
    }

    function tick(deltaTime) {
      seconds += deltaTime;
      const orbitAngle = seconds * 0.4;

      camera.transform.setPosition(
        Math.cos(orbitAngle) * 4,
        0,
        Math.sin(orbitAngle) * 4,
      );
      camera.transform.setRotationFromEuler(
        0,
        orbitAngle - Math.PI * 0.5,
        0,
      );

      box.transform.setRotationFromEuler(0, seconds * 0.9, 0);
      tube.transform.setRotationFromEuler(
        0,
        -seconds * 1.2,
        seconds * 0.5,
      );
      ball.transform.setRotationFromEuler(
        seconds * 0.8,
        seconds * 0.6,
        0,
      );

      animateColor(box.material, seconds, 0);
      animateColor(tube.material, seconds, 1.7);
      animateColor(ball.material, seconds, 3.4);
    }
  </script>

</game>`
app.append(textarea);
app.append(canvas);

if (!canvas || !textarea) {
  throw new Error("Canvas or textarea element not found");
}

function initializeCanvasSize(): void {
  const canvasRect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio;
  const width = Math.floor(canvasRect.width * pixelRatio);
  const height = Math.floor(canvasRect.height * pixelRatio);

  canvas.width = width;
  canvas.height = height;
}

let engine: Engine | null = null;
let renderer: Renderer | null = null;
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
  } finally {
    loading = false;
  }
}

// when the user changes the input, load the gamefile and launch the game
textarea.addEventListener("input", () => {
  void launchFromInput();
});

let previousSeconds = 0;
function startFrameLoop(): void {
  requestAnimationFrame(function frame(time) {
    const seconds = time * 0.001;
    const deltaTime = seconds - previousSeconds;
    previousSeconds = seconds;

    if (engine === null || renderer === null) {
      return; // runtime not initialized
    }

    engine.tick(deltaTime);
    renderer.render();
    requestAnimationFrame(frame);
  });
}

// launch the initial gamefile
await launchFromInput();

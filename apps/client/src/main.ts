import { Client } from "./client";

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
    const cameraSpeed = 3;
    const root = scene.root;
    const camera = root.children[0];
    const input = root.children[1];
    const box = root.children[3];
    const boxJoint = box.children[0];
    const tube = box.children[1];
    const tubeJoint = tube.children[0];
    const ball = tube.children[1];
    let cameraX = 0;
    let cameraZ = 4;

    camera.transform.setPosition(cameraX, 0, cameraZ);
    camera.transform.setRotationFromEuler(0, 0, 0);
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

      if (input.isDown("KeyW")) {
        cameraZ -= cameraSpeed * deltaTime;
      }
      if (input.isDown("KeyS")) {
        cameraZ += cameraSpeed * deltaTime;
      }
      if (input.isDown("KeyA")) {
        cameraX -= cameraSpeed * deltaTime;
      }
      if (input.isDown("KeyD")) {
        cameraX += cameraSpeed * deltaTime;
      }

      camera.transform.setPosition(cameraX, 0, cameraZ);

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

let client: Client | null = null;
let loading = false;

async function launchFromInput(): Promise<void> {
  if (loading) {
    return;
  }

  loading = true;

  try {
    client?.destroy();
    client = await Client.create(canvas);
    client.load(textarea.value);
  } finally {
    loading = false;
  }
}

// when the user changes the input, load the gamefile and launch the game
textarea.addEventListener("input", () => {
  void launchFromInput();
});

let previousSeconds = 0;
requestAnimationFrame(function frame(time) {
  const seconds = time * 0.001;
  const deltaTime = previousSeconds === 0 ? 0 : seconds - previousSeconds;
  previousSeconds = seconds;

  client?.tick(deltaTime);
  requestAnimationFrame(frame);
});

// launch the initial gamefile
await launchFromInput();

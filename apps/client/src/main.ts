import "./style.css";
import {
  createBall,
  createBox,
  createScript,
  createTube,
  Engine,
} from "@webgame/engine";
import { Renderer } from "@webgame/renderer";

const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.createElement("canvas");
app.append(canvas);

const canvasRect = canvas.getBoundingClientRect();
const pixelRatio = window.devicePixelRatio;
const width = Math.floor(canvasRect.width * pixelRatio);
const height = Math.floor(canvasRect.height * pixelRatio);

canvas.width = width;
canvas.height = height;

const engine = new Engine();
const renderer = await Renderer.create(engine, canvas);

const box = engine.addNode(createBox({
  transform: {
    position: [0, 0, 0],
  },
  width: 0.9,
  height: 0.9,
  depth: 0.9,
}));

const boxJoint = engine.addNode(createTube({
  transform: {
    position: [0.65, 0, 0],
  },
  radius: 0.08,
  height: 1.3,
  color: [0.9, 0.9, 0.9],
}), box);

const tube = engine.addNode(createTube({
  transform: {
    position: [1.3, 0, 0],
  },
  radius: 0.45,
  height: 1.1,
}), box);

const tubeJoint = engine.addNode(createTube({
  transform: {
    position: [0.55, 0, 0],
  },
  radius: 0.08,
  height: 1.1,
  color: [0.9, 0.9, 0.9],
}), tube);

const ball = engine.addNode(createBall({
  transform: {
    position: [1.1, 0, 0],
  },
  radius: 0.45,
}), tube);

renderer.render();

await createScript({
  parent: engine.scene,
  source: `
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
  `,
});

let previousSeconds = 0;

requestAnimationFrame(function frame(time) {
  const seconds = time * 0.001;
  const deltaTime = seconds - previousSeconds;
  previousSeconds = seconds;

  engine.tick(deltaTime);
  renderer.render();
  requestAnimationFrame(frame);
});

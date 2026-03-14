import "./style.css";
import {
  Renderer,
  setRotationFromEuler,
  type Material,
} from "@webgame/renderer";

const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.createElement("canvas");
app.append(canvas);

const canvasRect = canvas.getBoundingClientRect();
const pixelRatio = window.devicePixelRatio;
const width = Math.floor(canvasRect.width * pixelRatio);
const height = Math.floor(canvasRect.height * pixelRatio);

canvas.width = width;
canvas.height = height;

const renderer = await Renderer.create(canvas);

const box = renderer.engine.createBox({
  x: 0,
  y: 0,
  z: 0,
  width: 0.9,
  height: 0.9,
  depth: 0.9,
});

const boxJoint = renderer.engine.createTube({
  parent: box,
  x: 0.65,
  y: 0,
  z: 0,
  radius: 0.08,
  height: 1.3,
  color: [0.9, 0.9, 0.9],
});
setRotationFromEuler(boxJoint.transform.rotation, 0, 0, -Math.PI * 0.5);

const tube = renderer.engine.createTube({
  parent: box,
  x: 1.3,
  y: 0,
  z: 0,
  radius: 0.45,
  height: 1.1,
});

const tubeJoint = renderer.engine.createTube({
  parent: tube,
  x: 0.55,
  y: 0,
  z: 0,
  radius: 0.08,
  height: 1.1,
  color: [0.9, 0.9, 0.9],
});
setRotationFromEuler(tubeJoint.transform.rotation, 0, 0, -Math.PI * 0.5);

const ball = renderer.engine.createBall({
  parent: tube,
  x: 1.1,
  y: 0,
  z: 0,
  radius: 0.45,
});

function animateColor(color: Material, time: number, phase: number): void {
  color[0] = 0.5 + 0.5 * Math.sin(time + phase);
  color[1] = 0.5 + 0.5 * Math.sin(time * 1.3 + phase + 2);
  color[2] = 0.5 + 0.5 * Math.sin(time * 0.7 + phase + 4);
}

requestAnimationFrame(function frame(time) {
  const seconds = time * 0.001;
  const orbitAngle = seconds * 0.4;

  renderer.engine.camera.position[0] = Math.cos(orbitAngle) * 4;
  renderer.engine.camera.position[1] = 0;
  renderer.engine.camera.position[2] = Math.sin(orbitAngle) * 4;
  setRotationFromEuler(
    renderer.engine.camera.rotation,
    0,
    orbitAngle - Math.PI * 0.5,
    0,
  );

  setRotationFromEuler(box.transform.rotation, 0, seconds * 0.9, 0);
  setRotationFromEuler(
    tube.transform.rotation,
    0,
    -seconds * 1.2,
    seconds * 0.5,
  );
  setRotationFromEuler(
    ball.transform.rotation,
    seconds * 0.8,
    seconds * 0.6,
    0,
  );

  animateColor(box.material, seconds, 0);
  animateColor(tube.material, seconds, 1.7);
  animateColor(ball.material, seconds, 3.4);

  renderer.render();
  requestAnimationFrame(frame);
});

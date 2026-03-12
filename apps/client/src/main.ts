import "./style.css";
import { Engine, setRotationFromEuler, type SolidColor } from "@webgame/webge";

const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.createElement("canvas");
app.append(canvas);

const engine = await Engine.create(canvas);

const tube = engine.createTube({
  x: 0,
  y: 0,
  z: 0,
  radius: 0.45,
  height: 1.1,
});

const box = engine.createBox({
  x: 0,
  y: 0,
  z: 0,
  width: 0.9,
  height: 0.9,
  depth: 0.9,
});

const ball = engine.createBall({
  x: 1.8,
  y: 0,
  z: 0,
  radius: 0.6,
});

function animateColor(color: SolidColor, time: number, phase: number): void {
  color[0] = 0.5 + 0.5 * Math.sin(time + phase);
  color[1] = 0.5 + 0.5 * Math.sin(time * 1.3 + phase + 2);
  color[2] = 0.5 + 0.5 * Math.sin(time * 0.7 + phase + 4);
}

requestAnimationFrame(function frame(time) {
  const seconds = time * 0.001;
  const orbitAngle = seconds * 0.4;

  engine.camera.position[0] = Math.cos(orbitAngle) * 4;
  engine.camera.position[1] = 0;
  engine.camera.position[2] = Math.sin(orbitAngle) * 4;
  setRotationFromEuler(
    engine.camera.rotation,
    0,
    orbitAngle - Math.PI * 0.5,
    0,
  );

  setRotationFromEuler(box.transform.rotation, seconds * 0.7, seconds, 0);
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

  animateColor(box.color, seconds, 0);
  animateColor(tube.color, seconds, 1.7);
  animateColor(ball.color, seconds, 3.4);

  engine.render();
  requestAnimationFrame(frame);
});

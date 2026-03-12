import "./style.css";
import { Engine, type SolidColor } from "@webgame/webge";

const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.createElement("canvas");
canvas.style.display = "block";
canvas.style.width = "100%";
canvas.style.height = "100%";
app.append(canvas);

const engine = await Engine.create(canvas);
const box = engine.createBox({
  x: -1.8,
  y: -0.25,
  z: 0,
  width: 0.9,
  height: 0.9,
  depth: 0.9,
});

const tube = engine.createTube({
  x: 0,
  y: -0.2,
  z: 0,
  radius: 0.45,
  height: 1.1,
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

  box.rotationX = seconds * 0.7;
  box.rotationY = seconds;
  tube.rotationY = -seconds * 1.2;
  tube.rotationZ = seconds * 0.5;
  ball.rotationX = seconds * 0.8;
  ball.rotationY = seconds * 0.6;

  animateColor(box.color, seconds, 0);
  animateColor(tube.color, seconds, 1.7);
  animateColor(ball.color, seconds, 3.4);

  engine.render();
  requestAnimationFrame(frame);
});

import "./style.css";
import { Engine } from "@webgame/webge";

const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.createElement("canvas");
canvas.style.display = "block";
canvas.style.width = "100%";
canvas.style.height = "100%";
app.append(canvas);

const engine = await Engine.create(canvas);

engine.createBox({
  x: -1.8,
  y: -0.25,
  z: 0,
  width: 0.9,
  height: 0.9,
  depth: 0.9,
});

engine.createTube({
  x: 0,
  y: -0.2,
  z: 0,
  radius: 0.45,
  height: 1.1,
});

engine.createBall({
  x: 1.8,
  y: 0,
  z: 0,
  radius: 0.6,
});

requestAnimationFrame(function frame() {
  engine.render();
  requestAnimationFrame(frame);
});

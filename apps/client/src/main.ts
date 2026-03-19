import { Client } from "./client";
import defaultGameFile from "./default.game.xml?raw";

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("App element not found");
}

const textarea = document.createElement("textarea");
textarea.id = "gamefile-input";
textarea.rows = 48;
textarea.cols = 48;
textarea.value = defaultGameFile;

const canvas = document.createElement("canvas");
canvas.id = "canvas";

app.append(textarea, canvas);

const client = await Client.create(canvas);

textarea.addEventListener("input", () => {
  client.load(textarea.value);
});

let previousSeconds = 0;
requestAnimationFrame(function frame(time) {
  const seconds = time * 0.001;
  const deltaTime = previousSeconds === 0 ? 0 : seconds - previousSeconds;
  previousSeconds = seconds;

  client.tick(deltaTime);
  requestAnimationFrame(frame);
});

client.load(textarea.value);

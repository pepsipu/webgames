import "./style.css";
import { createTriangleRenderer } from "@webgame/webge";
const app = document.querySelector("#app");
const canvas = document.createElement("canvas");
app.append(canvas);
const renderer = await createTriangleRenderer(canvas);
renderer.render();
window.addEventListener("resize", () => {
    renderer.render();
});

import "./style.css";
import { Renderer } from "@webgame/webge";

const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.createElement("canvas");
app.append(canvas);

const renderer = await Renderer.create(canvas);
renderer.render();

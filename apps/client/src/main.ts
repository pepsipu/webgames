import "./style.css";
import { helloWorld } from "@webgame/webge";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>${helloWorld()}</h1>
`;

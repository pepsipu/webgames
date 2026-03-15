import { Engine } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import { parseXmlText, getText, getAttributes, toNodeArray, isNode } from "./parse-base";
import { loadSceneNode } from "./parse-scene";
import { loadUiNode } from "./parse-ui";
import { loadScriptNode } from "./parse-script";

// loads the game file onto an engine instance.
export async function loadGameFile(engine: Engine, text: string): Promise<void> {
  const parsed = parseXmlText(text);
  const games = toNodeArray(parsed.game);
  if (games.length === 0) {
    throw new Error("Invalid gamefile: missing <game> root element.");
  }
  if (games.length > 1) {
    throw new Error("Invalid gamefile: multiple <game> root elements found.");
  }
  
  const gameNode = games[0];
  await loadGameNode(engine, gameNode);
}

async function loadGameNode(engine: Engine, gameNode: UnparsedXmlNode): Promise<void> {
  const attributes = getAttributes(gameNode);
  const scenes = toNodeArray(gameNode.scene);
  const ui = toNodeArray(gameNode.ui);
  const scripts = toNodeArray(gameNode.script);

  for (const sceneNode of scenes) {
    loadSceneNode(engine, sceneNode);
  }
  for (const uiNode of ui) {
    loadUiNode(engine, uiNode);
  }
  for (const scriptNode of scripts) {
    await loadScriptNode(engine, scriptNode);
  }
}

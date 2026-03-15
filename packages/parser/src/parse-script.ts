import { Engine } from "@webgame/engine";
import type { Node, Vector3 } from "@webgame/engine";
import type { UnparsedXmlNode } from "./parse-base";
import { getText, getAttributes, toNodeArray } from "./parse-base";

export async function loadScriptNode(engine: Engine, scriptNode: UnparsedXmlNode): Promise<void> {
  const source = getText(scriptNode);
  const isLocal = (getAttributes(scriptNode).local ?? "false").toString().toLowerCase() === "true";

  // for now, treat all scripts as the same, load them into the game engine
  await engine.createScript({source});
}

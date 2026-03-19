export { scriptSystem } from "./system";
export {
  createScriptService,
  destroyScriptNode,
  getScriptService,
  hasScriptService,
  registerScriptNode,
} from "./service";
export { createScript, hasScript } from "./component";
export {
  createScriptValueHandle,
  dumpScriptValue,
  getNodeScriptables,
  registerScriptable,
  setScriptFunction,
  setScriptGetter,
} from "./scriptable";

export type {
  ScriptService,
  ScriptServiceComponent,
  ScriptServiceNode,
} from "./service";
export type {
  Script,
  ScriptComponent,
  ScriptOptions,
} from "./component";
export type { Scriptable } from "./scriptable";
export type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";

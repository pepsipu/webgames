export { scriptSystem } from "./system";
export {
  createScriptService,
  destroyScriptElement,
  getScriptService,
  hasScriptService,
  registerScriptElement,
} from "./service";
export { createScript, hasScript } from "./component";
export {
  createScriptValueHandle,
  dumpScriptValue,
  getElementScriptables,
  registerScriptable,
  setScriptFunction,
  setScriptGetter,
} from "./scriptable";

export type {
  ScriptService,
  ScriptServiceComponent,
  ScriptServiceElement,
} from "./service";
export type { Script, ScriptComponent, ScriptOptions } from "./component";
export type { Scriptable } from "./scriptable";
export type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten-core";

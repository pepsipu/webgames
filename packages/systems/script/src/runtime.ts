import type { Element } from "@webgames/engine";
import type { QuickJSHandle } from "quickjs-emscripten-core";
import { type QuickJSContext, type QuickJSRuntime } from "./module";
import { ScriptElement } from "./element";
import { installScriptGlobals } from "./globals";

const filename = "element.js";

export class ScriptState {
  context: QuickJSContext;
  source: string;
  tickHandle: QuickJSHandle | null;

  constructor(
    runtime: QuickJSRuntime,
    document: Element,
    element: ScriptElement,
  ) {
    this.context = runtime.newContext();
    this.source = element.source;
    this.tickHandle = null;
    installScriptGlobals(this.context, document);
  }

  tick(deltaTime: number) {
    if (this.tickHandle == null) {
      this.context
        .evalCode(this.source, filename, {
          strict: true,
          type: "global",
        })
        .dispose();

      // TODO: should unwrap eval for error handling here

      this.tickHandle = this.context.getProp(this.context.global, "tick");
    }

    const deltaTimeHandle = this.context.newNumber(deltaTime);
    this.context
      .callFunction(this.tickHandle, this.context.undefined, deltaTimeHandle)
      .dispose();

    // TODO: should unwrap func call for error handling here

    deltaTimeHandle.dispose();
  }

  destroy() {
    if (this.tickHandle) {
      this.tickHandle.dispose();
    }
    this.context.dispose();
  }
}

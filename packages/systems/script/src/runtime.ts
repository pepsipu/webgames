import type { Element, ElementRegistry } from "@webgames/engine";
import type {
  QuickJSContext,
  QuickJSHandle,
  QuickJSRuntime,
} from "quickjs-emscripten-core";
import { ScriptElement } from "./element";
import { installScriptGlobals } from "./globals";

const filename = "element.js";

export class ScriptState {
  context: QuickJSContext;
  source: string;
  tickHandle: QuickJSHandle | null;

  constructor(
    runtime: QuickJSRuntime,
    registry: ElementRegistry,
    document: Element,
    element: ScriptElement,
  ) {
    this.context = runtime.newContext();
    this.source = element.text;
    this.tickHandle = null;
    installScriptGlobals(this.context, registry, document);
  }

  tick(deltaTime: number): void {
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

  destroy(): void {
    if (this.tickHandle) {
      this.tickHandle.dispose();
    }
    this.context.dispose();
  }
}

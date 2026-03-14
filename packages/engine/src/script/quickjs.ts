import type {
  QuickJSContext,
  QuickJSRuntime,
  QuickJSWASMModule,
} from "quickjs-emscripten-core";

type InterruptHandlerFactory =
  typeof import("quickjs-emscripten-core").shouldInterruptAfterDeadline;

let quickJsPromise: Promise<QuickJSWASMModule> | undefined;
let interruptHandlerFactory: InterruptHandlerFactory | undefined;

export async function getQuickJS(): Promise<QuickJSWASMModule> {
  if (!quickJsPromise) {
    quickJsPromise = (async () => {
      const [core, { default: variant }] = await Promise.all([
        import("quickjs-emscripten-core"),
        import("@jitl/quickjs-ng-wasmfile-release-sync"),
      ]);

      interruptHandlerFactory = core.shouldInterruptAfterDeadline;
      return core.newQuickJSWASMModuleFromVariant(variant);
    })();
  }

  return quickJsPromise;
}

export function createDeadlineInterruptHandler(deadline: number) {
  if (!interruptHandlerFactory) {
    throw new Error("QuickJS has not been initialized.");
  }

  return interruptHandlerFactory(deadline);
}

export type { QuickJSContext, QuickJSRuntime };

import type {
  QuickJSContext,
  QuickJSRuntime,
  QuickJSWASMModule,
} from "quickjs-emscripten-core";

type InterruptHandlerFactory =
  typeof import("quickjs-emscripten-core").shouldInterruptAfterDeadline;

const [core, { default: variant }] = await Promise.all([
  import("quickjs-emscripten-core"),
  import("@jitl/quickjs-ng-wasmfile-release-sync"),
]);

const interruptHandlerFactory: InterruptHandlerFactory =
  core.shouldInterruptAfterDeadline;
const quickJs = await core.newQuickJSWASMModuleFromVariant(variant);

export function getQuickJS(): QuickJSWASMModule {
  return quickJs;
}

export function createDeadlineInterruptHandler(deadline: number) {
  return interruptHandlerFactory(deadline);
}

export type { QuickJSContext, QuickJSRuntime };

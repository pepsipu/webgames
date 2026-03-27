import type { EngineSystem } from "@webgames/engine";
import { loadRapier } from "./rapier";
import { PhysicsRuntime } from "./runtime";

export async function createPhysicsSystem(): Promise<EngineSystem> {
  const rapier = await loadRapier();
  const runtime = new PhysicsRuntime(rapier);

  return {
    install(engine) {
      engine.tickHandlers.push((engine, deltaTime) => {
        runtime.tick(engine, deltaTime);
      });
      engine.destroyHandlers.push(() => {
        runtime.destroy();
      });
    },
  };
}

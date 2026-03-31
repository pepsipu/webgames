import type { EngineSystem } from "@webgames/engine";
import { loadRapier } from "./rapier";
import { SphericalJointElement } from "./joint";
import { PhysicsRuntime } from "./runtime";
import { installShapePhysics } from "./shape";

export async function createPhysicsSystem(): Promise<EngineSystem> {
  const rapier = await loadRapier();
  const runtime = new PhysicsRuntime(rapier);

  return {
    install(engine) {
      installShapePhysics();
      engine.registry.register(SphericalJointElement);
      engine.tickHandlers.push((engine, deltaTime) => {
        runtime.tick(engine, deltaTime);
      });
      engine.destroyHandlers.push(() => {
        runtime.destroy();
      });
    },
  };
}

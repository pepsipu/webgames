export type Rapier = typeof import("@dimforge/rapier3d-compat");
export type ImpulseJoint = import("@dimforge/rapier3d-compat").ImpulseJoint;
export type RigidBody = import("@dimforge/rapier3d-compat").RigidBody;

export async function loadRapier(): Promise<Rapier> {
  // TODO: we should use non-compat rapier, but currently server is not bundled
  const rapier = await import("@dimforge/rapier3d-compat");

  await rapier.init();
  return rapier;
}

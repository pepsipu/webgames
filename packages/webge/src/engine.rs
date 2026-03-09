use std::collections::HashMap;

use rapier3d::prelude::*;

use crate::types::{ControlInput, Transform, Vec3};

pub type EntityId = u32;

#[derive(Clone, Copy, Debug)]
pub enum BodyType {
    Dynamic,
    Fixed,
    Kinematic,
}

#[derive(Clone, Copy, Debug)]
pub struct SphereSnapshot {
    pub entity: EntityId,
    pub center: Vec3,
    pub radius: f32,
    pub yaw: f32,
}

#[derive(Clone, Copy)]
struct BodyBinding {
    rigid_body: RigidBodyHandle,
    collider: ColliderHandle,
    sphere_radius: Option<f32>,
}

pub struct Engine {
    next_entity: EntityId,
    physics_pipeline: PhysicsPipeline,
    island_manager: IslandManager,
    broad_phase: DefaultBroadPhase,
    narrow_phase: NarrowPhase,
    rigid_bodies: RigidBodySet,
    colliders: ColliderSet,
    impulse_joints: ImpulseJointSet,
    multibody_joints: MultibodyJointSet,
    ccd_solver: CCDSolver,
    integration_parameters: IntegrationParameters,
    gravity: Vector<f32>,
    bindings: HashMap<EntityId, BodyBinding>,
    inputs: HashMap<EntityId, ControlInput>,
    yaws: HashMap<EntityId, f32>,
}

impl Engine {
    pub fn new(gravity_y: f32) -> Self {
        Self {
            next_entity: 0,
            physics_pipeline: PhysicsPipeline::new(),
            island_manager: IslandManager::new(),
            broad_phase: DefaultBroadPhase::new(),
            narrow_phase: NarrowPhase::new(),
            rigid_bodies: RigidBodySet::new(),
            colliders: ColliderSet::new(),
            impulse_joints: ImpulseJointSet::new(),
            multibody_joints: MultibodyJointSet::new(),
            ccd_solver: CCDSolver::new(),
            integration_parameters: IntegrationParameters::default(),
            gravity: vector![0.0, gravity_y, 0.0],
            bindings: HashMap::new(),
            inputs: HashMap::new(),
            yaws: HashMap::new(),
        }
    }

    pub fn spawn_entity(&mut self) -> EntityId {
        let entity = self.next_entity;
        self.next_entity = self.next_entity.saturating_add(1);
        entity
    }

    pub fn despawn_entity(&mut self, entity: EntityId) {
        if let Some(binding) = self.bindings.remove(&entity) {
            self.colliders.remove(
                binding.collider,
                &mut self.island_manager,
                &mut self.rigid_bodies,
                true,
            );
            self.rigid_bodies.remove(
                binding.rigid_body,
                &mut self.island_manager,
                &mut self.colliders,
                &mut self.impulse_joints,
                &mut self.multibody_joints,
                true,
            );
        }

        self.inputs.remove(&entity);
        self.yaws.remove(&entity);
    }

    pub fn set_input(&mut self, entity: EntityId, input: ControlInput) {
        self.inputs.insert(entity, input);
    }

    pub fn input(&self, entity: EntityId) -> ControlInput {
        self.inputs.get(&entity).copied().unwrap_or_default()
    }

    pub fn set_yaw(&mut self, entity: EntityId, yaw: f32) {
        self.yaws.insert(entity, yaw);
    }

    pub fn yaw(&self, entity: EntityId) -> f32 {
        self.yaws.get(&entity).copied().unwrap_or(0.0)
    }

    pub fn add_sphere_body(
        &mut self,
        entity: EntityId,
        body_type: BodyType,
        radius: f32,
        translation: Vec3,
        lock_rotations: bool,
    ) {
        self.remove_body(entity);

        let mut body_desc = match body_type {
            BodyType::Dynamic => RigidBodyBuilder::dynamic(),
            BodyType::Fixed => RigidBodyBuilder::fixed(),
            BodyType::Kinematic => RigidBodyBuilder::kinematic_position_based(),
        };

        body_desc = body_desc.translation(vector![translation.x, translation.y, translation.z]);

        if lock_rotations {
            body_desc = body_desc.lock_rotations();
        }

        let rigid_body = self.rigid_bodies.insert(body_desc);
        let collider = self.colliders.insert_with_parent(
            ColliderBuilder::ball(radius)
                .friction(0.0)
                .restitution(0.0)
                .build(),
            rigid_body,
            &mut self.rigid_bodies,
        );

        self.bindings.insert(
            entity,
            BodyBinding {
                rigid_body,
                collider,
                sphere_radius: Some(radius),
            },
        );
    }

    pub fn add_cuboid_body(
        &mut self,
        entity: EntityId,
        body_type: BodyType,
        half_extents: Vec3,
        translation: Vec3,
    ) {
        self.remove_body(entity);

        let body_desc = match body_type {
            BodyType::Dynamic => RigidBodyBuilder::dynamic(),
            BodyType::Fixed => RigidBodyBuilder::fixed(),
            BodyType::Kinematic => RigidBodyBuilder::kinematic_position_based(),
        }
        .translation(vector![translation.x, translation.y, translation.z]);

        let rigid_body = self.rigid_bodies.insert(body_desc);
        let collider = self.colliders.insert_with_parent(
            ColliderBuilder::cuboid(half_extents.x, half_extents.y, half_extents.z)
                .friction(0.9)
                .restitution(0.0)
                .build(),
            rigid_body,
            &mut self.rigid_bodies,
        );

        self.bindings.insert(
            entity,
            BodyBinding {
                rigid_body,
                collider,
                sphere_radius: None,
            },
        );
    }

    pub fn set_translation(&mut self, entity: EntityId, translation: Vec3, reset_velocity: bool) {
        let Some(binding) = self.bindings.get(&entity).copied() else {
            return;
        };

        let Some(body) = self.rigid_bodies.get_mut(binding.rigid_body) else {
            return;
        };

        body.set_translation(vector![translation.x, translation.y, translation.z], true);
        if reset_velocity {
            body.set_linvel(vector![0.0, 0.0, 0.0], true);
            body.set_angvel(vector![0.0, 0.0, 0.0], true);
        }
    }

    pub fn translation(&self, entity: EntityId) -> Option<Vec3> {
        let binding = self.bindings.get(&entity)?;
        let body = self.rigid_bodies.get(binding.rigid_body)?;
        let position = body.translation();

        Some(Vec3 {
            x: position.x,
            y: position.y,
            z: position.z,
        })
    }

    pub fn transform(&self, entity: EntityId) -> Option<Transform> {
        Some(Transform {
            translation: self.translation(entity)?,
            yaw: self.yaw(entity),
        })
    }

    pub fn linear_velocity(&self, entity: EntityId) -> Option<Vec3> {
        let binding = self.bindings.get(&entity)?;
        let body = self.rigid_bodies.get(binding.rigid_body)?;
        let velocity = body.linvel();

        Some(Vec3 {
            x: velocity.x,
            y: velocity.y,
            z: velocity.z,
        })
    }

    pub fn set_linear_velocity(&mut self, entity: EntityId, velocity: Vec3) {
        let Some(binding) = self.bindings.get(&entity).copied() else {
            return;
        };

        let Some(body) = self.rigid_bodies.get_mut(binding.rigid_body) else {
            return;
        };

        body.set_linvel(vector![velocity.x, velocity.y, velocity.z], true);
    }

    pub fn sphere_snapshots(&self) -> Vec<SphereSnapshot> {
        self.bindings
            .iter()
            .filter_map(|(entity, binding)| {
                let radius = binding.sphere_radius?;
                let body = self.rigid_bodies.get(binding.rigid_body)?;
                let center = body.translation();

                Some(SphereSnapshot {
                    entity: *entity,
                    center: Vec3 {
                        x: center.x,
                        y: center.y,
                        z: center.z,
                    },
                    radius,
                    yaw: self.yaw(*entity),
                })
            })
            .collect()
    }

    pub fn step(&mut self, dt_seconds: f32) {
        if dt_seconds <= 0.0 {
            return;
        }

        self.integration_parameters.dt = dt_seconds;
        self.physics_pipeline.step(
            &self.gravity,
            &self.integration_parameters,
            &mut self.island_manager,
            &mut self.broad_phase,
            &mut self.narrow_phase,
            &mut self.rigid_bodies,
            &mut self.colliders,
            &mut self.impulse_joints,
            &mut self.multibody_joints,
            &mut self.ccd_solver,
            None,
            &(),
            &(),
        );
    }

    fn remove_body(&mut self, entity: EntityId) {
        let Some(existing) = self.bindings.remove(&entity) else {
            return;
        };

        self.colliders.remove(
            existing.collider,
            &mut self.island_manager,
            &mut self.rigid_bodies,
            true,
        );
        self.rigid_bodies.remove(
            existing.rigid_body,
            &mut self.island_manager,
            &mut self.colliders,
            &mut self.impulse_joints,
            &mut self.multibody_joints,
            true,
        );
    }
}

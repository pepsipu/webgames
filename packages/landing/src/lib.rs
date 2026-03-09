use webge::{BodyType, ControlInput, Engine, EntityId, SphereSnapshot, Transform, Vec3};

const SURFACE_EPSILON: f32 = 1e-3;
const MAX_DT: f32 = 0.05;

#[derive(Clone, Copy, Debug)]
pub struct LandingConfig {
    pub ball_radius: f32,
    pub floor_half_extent: f32,
    pub floor_thickness: f32,
    pub move_speed: f32,
    pub orbit_speed: f32,
    pub jump_velocity: f32,
    pub gravity: f32,
    pub player_start_x: f32,
    pub player_start_y: f32,
    pub player_start_z: f32,
    pub player_start_yaw: f32,
}

impl Default for LandingConfig {
    fn default() -> Self {
        Self {
            ball_radius: 0.42,
            floor_half_extent: 80.0,
            floor_thickness: 0.5,
            move_speed: 18.0,
            orbit_speed: 2.2,
            jump_velocity: 12.0,
            gravity: -32.0,
            player_start_x: 0.0,
            player_start_y: 0.0,
            player_start_z: 2.0,
            player_start_yaw: 0.0,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct LandingRemoteBall {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

pub struct LandingGame {
    config: LandingConfig,
    local_ball: EntityId,
    floor: EntityId,
    local_yaw: f32,
    remote_balls: Vec<EntityId>,
}

impl LandingGame {
    pub fn new(engine: &mut Engine, config: LandingConfig) -> Self {
        let floor = engine.spawn_entity();
        let local_ball = engine.spawn_entity();

        engine.add_cuboid_body(
            floor,
            BodyType::Fixed,
            Vec3 {
                x: config.floor_half_extent,
                y: config.floor_thickness,
                z: config.floor_half_extent,
            },
            Vec3 {
                x: 0.0,
                y: -config.floor_thickness,
                z: 0.0,
            },
        );

        engine.add_sphere_body(
            local_ball,
            BodyType::Dynamic,
            config.ball_radius,
            Vec3 {
                x: config.player_start_x,
                y: config.player_start_y + config.ball_radius,
                z: config.player_start_z,
            },
            true,
        );
        engine.set_input(local_ball, ControlInput::default());
        engine.set_yaw(local_ball, normalize_angle(config.player_start_yaw));

        Self {
            config,
            local_ball,
            floor,
            local_yaw: normalize_angle(config.player_start_yaw),
            remote_balls: Vec::with_capacity(32),
        }
    }

    pub fn set_input(&self, engine: &mut Engine, input: ControlInput) {
        engine.set_input(self.local_ball, input);
    }

    pub fn sync_local_player(
        &mut self,
        engine: &mut Engine,
        x: f32,
        y: f32,
        z: f32,
        yaw: f32,
        reset_velocity: bool,
    ) {
        self.local_yaw = normalize_angle(yaw);
        engine.set_yaw(self.local_ball, self.local_yaw);
        engine.set_translation(
            self.local_ball,
            Vec3 {
                x,
                y: y + self.config.ball_radius,
                z,
            },
            reset_velocity,
        );
    }

    pub fn replace_remote_balls(&mut self, engine: &mut Engine, remotes: &[LandingRemoteBall]) {
        for entity in self.remote_balls.drain(..) {
            engine.despawn_entity(entity);
        }

        for remote in remotes {
            let entity = engine.spawn_entity();
            engine.add_sphere_body(
                entity,
                BodyType::Kinematic,
                self.config.ball_radius,
                Vec3 {
                    x: remote.x,
                    y: remote.y + self.config.ball_radius,
                    z: remote.z,
                },
                true,
            );
            self.remote_balls.push(entity);
        }
    }

    pub fn step(&mut self, engine: &mut Engine, dt_seconds: f32) {
        let dt = dt_seconds.clamp(0.0, MAX_DT);
        if dt <= 0.0 {
            return;
        }

        let input = engine.input(self.local_ball);
        self.local_yaw = normalize_angle(
            self.local_yaw + input.look_yaw_delta + input.move_x * self.config.orbit_speed * dt,
        );
        engine.set_yaw(self.local_ball, self.local_yaw);

        let mut velocity = engine.linear_velocity(self.local_ball).unwrap_or_default();
        let forward = -input.move_y;
        let speed = forward * self.config.move_speed;

        velocity.x = -self.local_yaw.sin() * speed;
        velocity.z = -self.local_yaw.cos() * speed;

        if let Some(position) = engine.translation(self.local_ball) {
            let is_on_surface = position.y <= self.config.ball_radius + SURFACE_EPSILON;
            if input.action_primary && is_on_surface {
                velocity.y = self.config.jump_velocity;
            }
        }

        engine.set_linear_velocity(self.local_ball, velocity);
        engine.step(dt);
    }

    pub fn local_player_transform(&self, engine: &Engine) -> Option<Transform> {
        let mut transform = engine.transform(self.local_ball)?;
        transform.translation.y -= self.config.ball_radius;
        Some(transform)
    }

    pub fn sphere_snapshots(&self, engine: &Engine) -> Vec<SphereSnapshot> {
        engine
            .sphere_snapshots()
            .into_iter()
            .filter(|sphere| sphere.entity != self.floor)
            .map(|mut sphere| {
                sphere.center.y -= sphere.radius;
                sphere
            })
            .collect()
    }

    pub fn local_ball_entity(&self) -> EntityId {
        self.local_ball
    }
}

fn normalize_angle(value: f32) -> f32 {
    let cycle = std::f32::consts::TAU;
    let normalized = value % cycle;
    if normalized < 0.0 {
        normalized + cycle
    } else {
        normalized
    }
}

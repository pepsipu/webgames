use serde::{Deserialize, Serialize};

use crate::ring_buffer::RingBuffer;

const FLOOR_Y: f32 = 0.0;
const MIN_DT: f32 = 0.0;
const MAX_DT: f32 = 0.05;
const SURFACE_EPSILON: f32 = 1e-6;
const OVERLAP_EPSILON: f32 = 1e-8;
const COLLISION_ITERATIONS: usize = 4;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    fn length_squared(self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct LocalPlayerState {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub yaw: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MoveInputPacket {
    pub horizontal: f32,
    pub vertical: f32,
    pub orbit_delta: f32,
    pub jump_pressed: bool,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct RemotePlayerState {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EnginePacket {
    SyncLocal {
        player: LocalPlayerState,
        reset_vertical_velocity: bool,
    },
    LocalInput {
        input: MoveInputPacket,
    },
    RemoteSnapshot {
        players: Vec<RemotePlayerState>,
    },
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct EngineConfig {
    pub ball_radius: f32,
    pub move_speed: f32,
    pub orbit_speed: f32,
    pub jump_velocity: f32,
    pub gravity: f32,
    pub packet_capacity: usize,
    pub player_start_x: f32,
    pub player_start_y: f32,
    pub player_start_z: f32,
    pub player_start_yaw: f32,
}

impl Default for EngineConfig {
    fn default() -> Self {
        Self {
            ball_radius: 0.42,
            move_speed: 18.0,
            orbit_speed: 2.2,
            jump_velocity: 12.0,
            gravity: -32.0,
            packet_capacity: 256,
            player_start_x: 0.0,
            player_start_y: 0.0,
            player_start_z: 2.0,
            player_start_yaw: 0.0,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
pub struct EnginePacketStats {
    pub capacity: usize,
    pub queued: usize,
    pub dropped: u64,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct EngineStepResult {
    pub player: LocalPlayerState,
}

#[derive(Clone, Copy, Debug)]
struct MoveInput {
    horizontal: f32,
    vertical: f32,
    orbit_delta: f32,
    jump_pressed: bool,
}

impl Default for MoveInput {
    fn default() -> Self {
        Self {
            horizontal: 0.0,
            vertical: 0.0,
            orbit_delta: 0.0,
            jump_pressed: false,
        }
    }
}

pub struct EngineCore {
    config: EngineConfig,
    player: LocalPlayerState,
    input: MoveInput,
    remote_players: Vec<RemotePlayerState>,
    packets: RingBuffer<EnginePacket>,
    vertical_velocity: f32,
}

impl EngineCore {
    pub fn new(config: EngineConfig) -> Self {
        let packet_capacity = config.packet_capacity.max(1);
        let player = LocalPlayerState {
            x: config.player_start_x,
            y: config.player_start_y,
            z: config.player_start_z,
            yaw: normalize_yaw(config.player_start_yaw),
        };

        Self {
            config,
            player,
            input: MoveInput::default(),
            remote_players: Vec::new(),
            packets: RingBuffer::new(packet_capacity),
            vertical_velocity: 0.0,
        }
    }

    pub fn enqueue_packet(&mut self, packet: EnginePacket) {
        self.packets.push(packet);
    }

    pub fn clear_packets(&mut self) {
        self.packets.clear();
    }

    pub fn packet_stats(&self) -> EnginePacketStats {
        EnginePacketStats {
            capacity: self.packets.capacity(),
            queued: self.packets.len(),
            dropped: self.packets.dropped_count(),
        }
    }

    pub fn snapshot(&self) -> EngineStepResult {
        EngineStepResult {
            player: self.player,
        }
    }

    pub fn step(&mut self, dt_seconds: f32) -> EngineStepResult {
        self.apply_packets();

        let dt = dt_seconds.clamp(MIN_DT, MAX_DT);
        if dt <= 0.0 {
            return self.snapshot();
        }

        let forward_input = -self.input.vertical;
        let orbit_input = self.input.horizontal;

        self.player.yaw = normalize_yaw(
            self.player.yaw + self.input.orbit_delta + orbit_input * self.config.orbit_speed * dt,
        );

        let move_step = forward_input * self.config.move_speed * dt;
        let mut target = Vec3 {
            x: self.player.x + -self.player.yaw.sin() * move_step,
            y: self.player.y,
            z: self.player.z + -self.player.yaw.cos() * move_step,
        };

        if self.input.jump_pressed && self.player.y <= SURFACE_EPSILON {
            self.vertical_velocity = self.config.jump_velocity;
        }

        self.vertical_velocity += self.config.gravity * dt;
        target.y += self.vertical_velocity * dt;

        if target.y < FLOOR_Y {
            target.y = FLOOR_Y;
            self.vertical_velocity = 0.0;
        }

        target = self.resolve_remote_collisions(target);

        self.player.x = target.x;
        self.player.y = target.y;
        self.player.z = target.z;

        self.snapshot()
    }

    fn apply_packets(&mut self) {
        while let Some(packet) = self.packets.pop() {
            match packet {
                EnginePacket::SyncLocal {
                    player,
                    reset_vertical_velocity,
                } => {
                    self.player = LocalPlayerState {
                        x: player.x,
                        y: player.y,
                        z: player.z,
                        yaw: normalize_yaw(player.yaw),
                    };
                    if reset_vertical_velocity {
                        self.vertical_velocity = 0.0;
                    }
                }
                EnginePacket::LocalInput { input } => {
                    self.input = MoveInput {
                        horizontal: input.horizontal.clamp(-1.0, 1.0),
                        vertical: input.vertical.clamp(-1.0, 1.0),
                        orbit_delta: input.orbit_delta,
                        jump_pressed: input.jump_pressed,
                    };
                }
                EnginePacket::RemoteSnapshot { players } => {
                    self.remote_players = players;
                }
            }
        }
    }

    fn resolve_remote_collisions(&self, mut target: Vec3) -> Vec3 {
        let min_distance = self.config.ball_radius * 2.0;
        let min_distance_sq = min_distance * min_distance;

        for _ in 0..COLLISION_ITERATIONS {
            let mut moved = false;

            for remote in &self.remote_players {
                let offset = Vec3 {
                    x: target.x - remote.x,
                    y: target.y - remote.y,
                    z: target.z - remote.z,
                };

                let distance_sq = offset.length_squared();
                if distance_sq >= min_distance_sq {
                    continue;
                }

                moved = true;

                if distance_sq <= OVERLAP_EPSILON {
                    target.x += min_distance;
                    continue;
                }

                let distance = distance_sq.sqrt();
                let penetration = min_distance - distance;
                let inv_distance = 1.0 / distance;

                target.x += offset.x * inv_distance * penetration;
                target.y += offset.y * inv_distance * penetration;
                target.z += offset.z * inv_distance * penetration;
            }

            if !moved {
                break;
            }
        }

        target
    }
}

fn normalize_yaw(yaw: f32) -> f32 {
    let cycle = std::f32::consts::TAU;
    let normalized = yaw % cycle;
    if normalized < 0.0 {
        normalized + cycle
    } else {
        normalized
    }
}

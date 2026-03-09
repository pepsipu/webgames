use std::cell::RefCell;

use landing::{LandingConfig, LandingGame, LandingRemoteBall};
use webge::{ControlInput, Engine, SharedRing};

const PACKET_RING_CAPACITY: u32 = 2048;
const INPUT_RING_CAPACITY: u32 = 512;
const PACKET_STRIDE: u32 = 32;
const INPUT_STRIDE: u32 = 20;

const PACKET_SYNC_LOCAL: u32 = 1;
const PACKET_CLEAR_REMOTES: u32 = 2;
const PACKET_PUSH_REMOTE: u32 = 3;

const INPUT_SET_MOVE: u32 = 1;

const MAX_RENDER_SPHERES: usize = 64;

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct RuntimePlayerState {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub yaw: f32,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct RuntimeSphereState {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub radius: f32,
    pub kind: u32,
}

struct Runtime {
    engine: Engine,
    game: LandingGame,
    packet_ring: SharedRing,
    input_ring: SharedRing,
    packet_scratch: [u8; PACKET_STRIDE as usize],
    input_scratch: [u8; INPUT_STRIDE as usize],
    remotes: Vec<LandingRemoteBall>,
    remotes_dirty: bool,
    local_state: RuntimePlayerState,
    render_sphere_count: u32,
    render_spheres: [RuntimeSphereState; MAX_RENDER_SPHERES],
}

impl Runtime {
    fn new(config: LandingConfig) -> Self {
        let mut engine = Engine::new(config.gravity);
        let game = LandingGame::new(&mut engine, config);

        let mut runtime = Self {
            engine,
            game,
            packet_ring: SharedRing::new(PACKET_RING_CAPACITY, PACKET_STRIDE),
            input_ring: SharedRing::new(INPUT_RING_CAPACITY, INPUT_STRIDE),
            packet_scratch: [0; PACKET_STRIDE as usize],
            input_scratch: [0; INPUT_STRIDE as usize],
            remotes: Vec::with_capacity(64),
            remotes_dirty: false,
            local_state: RuntimePlayerState::default(),
            render_sphere_count: 0,
            render_spheres: [RuntimeSphereState::default(); MAX_RENDER_SPHERES],
        };

        runtime.refresh_outputs();
        runtime
    }

    fn packet_ring_header_ptr(&mut self) -> u32 {
        self.packet_ring.header_ptr()
    }

    fn input_ring_header_ptr(&mut self) -> u32 {
        self.input_ring.header_ptr()
    }

    fn player_state_ptr(&mut self) -> u32 {
        (&mut self.local_state as *mut RuntimePlayerState as usize) as u32
    }

    fn render_sphere_count(&self) -> u32 {
        self.render_sphere_count
    }

    fn render_spheres_ptr(&mut self) -> u32 {
        self.render_spheres.as_mut_ptr() as usize as u32
    }

    fn step(&mut self, dt_seconds: f32) {
        self.drain_packets();
        self.drain_inputs();

        if self.remotes_dirty {
            self.game
                .replace_remote_balls(&mut self.engine, &self.remotes);
            self.remotes_dirty = false;
        }

        self.game.step(&mut self.engine, dt_seconds);
        self.refresh_outputs();
    }

    fn drain_packets(&mut self) {
        while self.packet_ring.pop(&mut self.packet_scratch) {
            match read_u32_le(&self.packet_scratch, 0) {
                PACKET_SYNC_LOCAL => {
                    self.game.sync_local_player(
                        &mut self.engine,
                        read_f32_le(&self.packet_scratch, 4),
                        read_f32_le(&self.packet_scratch, 8),
                        read_f32_le(&self.packet_scratch, 12),
                        read_f32_le(&self.packet_scratch, 16),
                        read_u32_le(&self.packet_scratch, 20) != 0,
                    );
                }
                PACKET_CLEAR_REMOTES => {
                    self.remotes.clear();
                    self.remotes_dirty = true;
                }
                PACKET_PUSH_REMOTE => {
                    self.remotes.push(LandingRemoteBall {
                        x: read_f32_le(&self.packet_scratch, 4),
                        y: read_f32_le(&self.packet_scratch, 8),
                        z: read_f32_le(&self.packet_scratch, 12),
                    });
                    self.remotes_dirty = true;
                }
                _ => {}
            }
        }
    }

    fn drain_inputs(&mut self) {
        let mut latest_input: Option<ControlInput> = None;

        while self.input_ring.pop(&mut self.input_scratch) {
            if read_u32_le(&self.input_scratch, 0) != INPUT_SET_MOVE {
                continue;
            }

            latest_input = Some(ControlInput {
                move_x: read_f32_le(&self.input_scratch, 4),
                move_y: read_f32_le(&self.input_scratch, 8),
                look_yaw_delta: read_f32_le(&self.input_scratch, 12),
                action_primary: read_u32_le(&self.input_scratch, 16) != 0,
            });
        }

        if let Some(input) = latest_input {
            self.game.set_input(&mut self.engine, input);
        }
    }

    fn refresh_outputs(&mut self) {
        if let Some(local) = self.game.local_player_transform(&self.engine) {
            self.local_state = RuntimePlayerState {
                x: local.translation.x,
                y: local.translation.y,
                z: local.translation.z,
                yaw: local.yaw,
            };
        }

        self.render_sphere_count = 0;
        let local_entity = self.game.local_ball_entity();
        let snapshots = self.game.sphere_snapshots(&self.engine);

        for snapshot in snapshots.into_iter().take(MAX_RENDER_SPHERES) {
            let index = self.render_sphere_count as usize;
            self.render_spheres[index] = RuntimeSphereState {
                x: snapshot.center.x,
                y: snapshot.center.y,
                z: snapshot.center.z,
                radius: snapshot.radius,
                kind: if snapshot.entity == local_entity {
                    1
                } else {
                    2
                },
            };
            self.render_sphere_count += 1;
        }

        for index in self.render_sphere_count as usize..MAX_RENDER_SPHERES {
            self.render_spheres[index] = RuntimeSphereState::default();
        }
    }
}

fn read_u32_le(bytes: &[u8], offset: usize) -> u32 {
    let mut value = [0_u8; 4];
    value.copy_from_slice(&bytes[offset..offset + 4]);
    u32::from_le_bytes(value)
}

fn read_f32_le(bytes: &[u8], offset: usize) -> f32 {
    let mut value = [0_u8; 4];
    value.copy_from_slice(&bytes[offset..offset + 4]);
    f32::from_le_bytes(value)
}

thread_local! {
    static RUNTIME: RefCell<Option<Runtime>> = const { RefCell::new(None) };
}

fn with_runtime_mut<R>(callback: impl FnOnce(&mut Runtime) -> R) -> Option<R> {
    RUNTIME.with(|runtime| {
        let mut runtime = runtime.borrow_mut();
        let runtime = runtime.as_mut()?;
        Some(callback(runtime))
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn webge_runtime_init(
    ball_radius: f32,
    move_speed: f32,
    orbit_speed: f32,
    jump_velocity: f32,
    gravity: f32,
    player_start_x: f32,
    player_start_y: f32,
    player_start_z: f32,
    player_start_yaw: f32,
) -> u32 {
    let config = LandingConfig {
        ball_radius,
        move_speed,
        orbit_speed,
        jump_velocity,
        gravity,
        player_start_x,
        player_start_y,
        player_start_z,
        player_start_yaw,
        ..LandingConfig::default()
    };

    RUNTIME.with(|runtime| {
        *runtime.borrow_mut() = Some(Runtime::new(config));
    });

    1
}

#[unsafe(no_mangle)]
pub extern "C" fn webge_runtime_packet_ring_header_ptr() -> u32 {
    with_runtime_mut(|runtime| runtime.packet_ring_header_ptr()).unwrap_or(0)
}

#[unsafe(no_mangle)]
pub extern "C" fn webge_runtime_input_ring_header_ptr() -> u32 {
    with_runtime_mut(|runtime| runtime.input_ring_header_ptr()).unwrap_or(0)
}

#[unsafe(no_mangle)]
pub extern "C" fn webge_runtime_player_state_ptr() -> u32 {
    with_runtime_mut(|runtime| runtime.player_state_ptr()).unwrap_or(0)
}

#[unsafe(no_mangle)]
pub extern "C" fn webge_runtime_render_sphere_count() -> u32 {
    with_runtime_mut(|runtime| runtime.render_sphere_count()).unwrap_or(0)
}

#[unsafe(no_mangle)]
pub extern "C" fn webge_runtime_render_spheres_ptr() -> u32 {
    with_runtime_mut(|runtime| runtime.render_spheres_ptr()).unwrap_or(0)
}

#[unsafe(no_mangle)]
pub extern "C" fn webge_runtime_step(dt_seconds: f32) {
    let _ = with_runtime_mut(|runtime| runtime.step(dt_seconds));
}

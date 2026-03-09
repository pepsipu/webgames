mod core;
mod ring_buffer;

pub use core::{
    EngineConfig, EngineCore, EnginePacket, EnginePacketStats, EngineStepResult, LocalPlayerState,
    MoveInputPacket, RemotePlayerState,
};

#[cfg(feature = "wasm")]
mod wasm;

#[cfg(feature = "wasm")]
pub use wasm::WebgeEngine;

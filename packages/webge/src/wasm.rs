use wasm_bindgen::prelude::*;

use crate::core::{EngineConfig, EngineCore, EnginePacket};

#[wasm_bindgen]
pub struct WebgeEngine {
    core: EngineCore,
}

#[wasm_bindgen]
impl WebgeEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> Result<WebgeEngine, JsValue> {
        console_error_panic_hook::set_once();

        let config = serde_wasm_bindgen::from_value::<EngineConfig>(config)
            .map_err(|error| JsValue::from_str(&format!("Invalid engine config: {error}")))?;

        Ok(Self {
            core: EngineCore::new(config),
        })
    }

    pub fn enqueue_packet(&mut self, packet: JsValue) -> Result<(), JsValue> {
        let packet = serde_wasm_bindgen::from_value::<EnginePacket>(packet)
            .map_err(|error| JsValue::from_str(&format!("Invalid engine packet: {error}")))?;

        self.core.enqueue_packet(packet);
        Ok(())
    }

    pub fn clear_packets(&mut self) {
        self.core.clear_packets();
    }

    pub fn packet_stats(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.core.packet_stats()).map_err(|error| {
            JsValue::from_str(&format!("Failed to serialize packet stats: {error}"))
        })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.core.snapshot())
            .map_err(|error| JsValue::from_str(&format!("Failed to serialize snapshot: {error}")))
    }

    pub fn step(&mut self, dt_seconds: f32) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.core.step(dt_seconds)).map_err(|error| {
            JsValue::from_str(&format!("Failed to serialize step result: {error}"))
        })
    }
}

# webge_runtime

WASM linker/runtime crate that composes `webge` (engine) and `landing` (game rules).

JS in `apps/client` owns all transport wiring (input/network packet writes via shared rings).

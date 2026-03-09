# @webgame/webge

Standalone Rust game engine core for this repo.

## Goals

- Owns simulation state and packet processing.
- Uses a fixed-size ring buffer for incoming engine packets.
- Does not depend on any other package in this repository.
- Compiles to WASM for browser clients.
- Can compile for non-WASM targets with `--no-default-features`.

## Build

```bash
pnpm --filter @webgame/webge build:wasm
```

## Rust checks

```bash
pnpm --filter @webgame/webge check:rust
pnpm --filter @webgame/webge check:rust:native
```

import { Element, script } from "@webgames/engine";

export class InputServiceElement extends Element {
  down: Set<string>;
  pressed: Set<string>;
  released: Set<string>;

  constructor() {
    super();
    this.name = "input";
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
  }

  @script()
  isDown(code: string): boolean {
    return this.down.has(code);
  }

  @script()
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  @script()
  wasReleased(code: string): boolean {
    return this.released.has(code);
  }

  pressKey(code: string): void {
    if (this.down.has(code)) {
      return;
    }

    this.down.add(code);
    this.pressed.add(code);
  }

  releaseKey(code: string): void {
    if (!this.down.has(code)) {
      return;
    }

    this.down.delete(code);
    this.released.add(code);
  }

  clearFrame(): void {
    this.pressed.clear();
    this.released.clear();
  }

  reset(): void {
    this.down.clear();
    this.clearFrame();
  }
}

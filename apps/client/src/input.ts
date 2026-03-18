import {
  pressKey,
  releaseKey,
  resetInput,
  type InputServiceNode,
} from "@webgame/engine";

export class KeyboardInput {
  readonly inputService: InputServiceNode;

  constructor(inputService: InputServiceNode) {
    this.inputService = inputService;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    resetInput(this.inputService);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    pressKey(this.inputService, event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    releaseKey(this.inputService, event.code);
  };

  private onBlur = (): void => {
    resetInput(this.inputService);
  };
}

import type { PositionPayload } from "@webgame/shared";
import { CHAT_BUBBLE_HEIGHT_FACTOR } from "./config";
import type { ProjectedPoint, Vec3 } from "../scene/sceneRenderer";

export type ChatBubbleProject = (world: Vec3) => ProjectedPoint | null;

type ChatBubblePosition = Pick<PositionPayload, "x" | "y" | "z">;

export class ChatBubble {
  private message = "";

  constructor(private readonly element: HTMLDivElement) {}

  setMessage(text: string): void {
    this.message = text;
    this.element.textContent = text;
  }

  project(
    project: ChatBubbleProject,
    position: ChatBubblePosition,
    radius: number,
  ): void {
    const projected = this.message
      ? project([
          position.x,
          position.y + radius * CHAT_BUBBLE_HEIGHT_FACTOR,
          position.z,
        ])
      : null;

    const visible = projected !== null;
    this.element.classList.toggle("visible", visible);
    this.element.classList.toggle("hidden", !visible);

    if (!projected) {
      return;
    }

    this.element.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`;
  }

  remove(): void {
    this.element.remove();
  }
}

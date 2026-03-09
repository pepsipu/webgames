import type { PositionPayload } from "@webgame/shared";
import { CHAT_BUBBLE_HEIGHT_FACTOR } from "./config";
import type { ProjectedPoint, Vec3 } from "../scene/sceneRenderer";

export type ChatBubbleProject = (world: Vec3) => ProjectedPoint | null;

type ChatBubblePosition = Pick<PositionPayload, "x" | "y" | "z">;

export function createChatBubble(element: HTMLDivElement) {
  let message = "";

  return {
    getMessage: () => message,
    setMessage(text: string): void {
      message = text;
      element.textContent = message;
    },
    update(projected: ProjectedPoint | null): void {
      const visible = Boolean(message) && projected !== null;
      element.classList.toggle("visible", visible);
      element.classList.toggle("hidden", !visible);

      if (visible) {
        element.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`;
      }
    },
    remove: () => {
      element.remove();
    },
  };
}

export function updateProjectedChatBubble(
  bubble: Pick<ReturnType<typeof createChatBubble>, "getMessage" | "update">,
  project: ChatBubbleProject,
  position: ChatBubblePosition,
  radius: number,
): void {
  const projected = bubble.getMessage()
    ? project([
        position.x,
        position.y + radius * CHAT_BUBBLE_HEIGHT_FACTOR,
        position.z,
      ])
    : null;

  bubble.update(projected);
}

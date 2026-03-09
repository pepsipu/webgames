import type { ProjectedPoint } from "../scene/sceneRenderer";

function setBubbleTransform(element: HTMLElement, projected: ProjectedPoint): void {
  element.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`;
}

function setBubbleVisible(element: HTMLElement, visible: boolean): void {
  element.classList.toggle("visible", visible);
  element.classList.toggle("hidden", !visible);
}

export function createLocalChat(chatBubble: HTMLDivElement): {
  getMessage: () => string;
  setMessage: (text: string) => void;
  update: (projected: ProjectedPoint | null) => void;
} {
  let message = "";

  function setMessage(text: string): void {
    message = text.trim();
    chatBubble.textContent = message;
  }

  function update(projected: ProjectedPoint | null): void {
    if (message && projected) {
      setBubbleTransform(chatBubble, projected);
      setBubbleVisible(chatBubble, true);
      return;
    }

    setBubbleVisible(chatBubble, false);
  }

  return {
    getMessage: () => message,
    setMessage,
    update,
  };
}

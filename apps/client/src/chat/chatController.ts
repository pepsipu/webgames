import { isTypingTarget } from "../utils/dom";
import type { ProjectedPoint } from "../types";

export function createChatController({
  chatBubble,
  chatForm,
  chatInput,
  projectBubble,
  onSubmit,
}: {
  chatBubble: HTMLDivElement;
  chatForm: HTMLFormElement;
  chatInput: HTMLInputElement;
  projectBubble: () => ProjectedPoint | null;
  onSubmit?: (text: string) => void;
}): {
  setMessage: (nextMessage: string) => void;
  update: () => void;
} {
  let message = "";

  function setMessage(nextMessage: string): void {
    message = nextMessage.trim();
    chatBubble.textContent = message;
    update();
  }

  function update(): void {
    if (!message) {
      chatBubble.classList.remove("visible");
      return;
    }

    const projected = projectBubble();
    if (!projected) {
      chatBubble.classList.remove("visible");
      return;
    }

    chatBubble.style.transform = `translate(-50%, -100%) translate(${projected.x}px, ${projected.y - 10}px)`;
    chatBubble.classList.add("visible");
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();

    const text = chatInput.value.trim();
    if (!text) {
      return;
    }

    setMessage(text);
    chatInput.value = "";
    chatInput.blur();

    onSubmit?.(text);
  }

  function handleShortcut(event: KeyboardEvent): void {
    if (event.code !== "Slash") {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    event.preventDefault();
    chatInput.focus();
  }

  function handleGlobalPointerDown(event: PointerEvent): void {
    if (document.activeElement !== chatInput) {
      return;
    }

    const targetNode = event.target;
    if (targetNode instanceof Node && chatForm.contains(targetNode)) {
      return;
    }

    // If we were previously on the chat form, and we clicked off of it,
    // unfocus the chat input and stop propagation (to prevent the click from being recieved as a jump control)
    chatInput.blur();
    event.stopPropagation();
  }

  chatForm.addEventListener("submit", handleSubmit);
  window.addEventListener("keydown", handleShortcut, { passive: false });
  window.addEventListener("pointerdown", handleGlobalPointerDown, {
    capture: true,
    passive: true,
  });

  return { setMessage, update };
}

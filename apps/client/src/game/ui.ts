import { CHAT_LIMIT } from "@webgame/shared";
import { NETWORK_STATUS_LABELS, type NetworkStatus } from "./config";

export interface SceneUi {
  canvas: HTMLCanvasElement;
  chatBubble: HTMLDivElement;
  chatForm: HTMLFormElement;
  chatInput: HTMLInputElement;
  networkStatus: HTMLDivElement;
  remoteLayer: HTMLDivElement;
}

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }

  return element;
}

export function createSceneUi(rootElement: HTMLElement): SceneUi {
  rootElement.innerHTML = `
    <div class="scene-root">
      <canvas class="gpu-canvas"></canvas>
      <div class="chat-bubble"></div>
      <div class="remote-layer"></div>
      <div class="network-status connecting">Connecting...</div>
      <form class="chat-ui" autocomplete="off">
        <input
          class="chat-input"
          type="text"
          maxlength="${CHAT_LIMIT}"
          placeholder="Say something..."
        />
        <button class="chat-send" type="submit">Send</button>
      </form>
    </div>
  `;

  const root = requireElement<HTMLDivElement>(rootElement, ".scene-root");

  return {
    canvas: requireElement<HTMLCanvasElement>(root, ".gpu-canvas"),
    chatBubble: requireElement<HTMLDivElement>(root, ".chat-bubble"),
    chatForm: requireElement<HTMLFormElement>(root, ".chat-ui"),
    chatInput: requireElement<HTMLInputElement>(root, ".chat-input"),
    networkStatus: requireElement<HTMLDivElement>(root, ".network-status"),
    remoteLayer: requireElement<HTMLDivElement>(root, ".remote-layer"),
  };
}

export function setNetworkStatus(
  element: HTMLElement,
  status: NetworkStatus,
): void {
  element.classList.remove("connecting", "connected", "disconnected");
  element.classList.add(status);
  element.textContent = NETWORK_STATUS_LABELS[status];
}

export function showError(rootElement: HTMLElement, message: string): void {
  rootElement.innerHTML = `<p class="error">${message}</p>`;
}

export function getViewportSize(): { width: number; height: number } {
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
}

export type VirtualKeyboardLike = {
  overlaysContent: boolean;
  boundingRect: DOMRectReadOnly;
  addEventListener: (
    type: "geometrychange",
    listener: EventListenerOrEventListenerObject,
  ) => void;
};

export function getVirtualKeyboard(): VirtualKeyboardLike | null {
  const navigatorWithVirtualKeyboard = navigator as Navigator & {
    virtualKeyboard?: VirtualKeyboardLike;
  };
  return navigatorWithVirtualKeyboard.virtualKeyboard ?? null;
}

export function computeKeyboardInsetPx(): number {
  const virtualKeyboard = getVirtualKeyboard();
  if (virtualKeyboard) {
    const virtualKeyboardHeight = Math.max(
      0,
      Math.round(virtualKeyboard.boundingRect.height),
    );
    return virtualKeyboardHeight;
  }

  // todo: this might be useless, test on safari mobile, otherwise just always return 0
  const viewport = window.visualViewport;
  if (!viewport) {
    return 0;
  }

  // otherwise, calculate diff between layout viewport and visual viewport as keyboard height
  const layoutViewportHeight = Math.max(1, document.documentElement.clientHeight);
  const visibleBottom = viewport.offsetTop + viewport.height;

  const keyboardHeight = Math.round(
    Math.max(0, layoutViewportHeight - visibleBottom),
  );

  return Math.round(keyboardHeight);
}

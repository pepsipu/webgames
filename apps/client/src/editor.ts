import defaultGameFile from "./default.game.xml?raw";
import doublePendulumGameFile from "./double-pendulum.game.xml?raw";

type Tab = {
  name: string;
  text: string;
};

type StoredEditorState = {
  activeTabIndex: number;
  tabs: Tab[];
};

type EditorState = {
  activeTabIndex: number;
  tabs: Tab[];
};

const storageKey = "webgames.editor";
const startingTabs: readonly Tab[] = [
  {
    name: "default.game.xml",
    text: defaultGameFile,
  },
  {
    name: "double-pendulum.game.xml",
    text: doublePendulumGameFile,
  },
];

export function createEditor(): HTMLDivElement {
  const state = loadEditorState();

  const editor = document.createElement("div");
  editor.id = "editor";

  const tabs = document.createElement("div");
  tabs.id = "editor-tabs";

  const textarea = document.createElement("textarea");
  textarea.id = "gamefile-input";

  editor.append(tabs, textarea);

  textarea.addEventListener("input", updateActiveTabText);
  textarea.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    textarea.setRangeText(
      "  ",
      textarea.selectionStart,
      textarea.selectionEnd,
      "end",
    );
    updateActiveTabText();
  });

  render();
  void uploadGameFile(getActiveTab().text);

  return editor;

  function updateActiveTabText(): void {
    getActiveTab().text = textarea.value;
    saveEditorState(state);
    void uploadGameFile(textarea.value);
  }

  function render(): void {
    tabs.replaceChildren();

    for (const [index, tab] of state.tabs.entries()) {
      const button = document.createElement("button");
      button.disabled = index === state.activeTabIndex;
      button.textContent = tab.name;
      button.addEventListener("click", () => {
        setActiveTab(index);
      });
      tabs.append(button);

      if (index < startingTabs.length) {
        continue;
      }

      const closeButton = document.createElement("button");
      closeButton.textContent = "x";
      closeButton.addEventListener("click", () => {
        deleteTab(index);
      });
      tabs.append(closeButton);
    }

    const addButton = document.createElement("button");
    addButton.textContent = "+";
    addButton.addEventListener("click", addTab);
    tabs.append(addButton);

    textarea.value = getActiveTab().text;
  }

  function getActiveTab(): Tab {
    return state.tabs[state.activeTabIndex]!;
  }

  function setActiveTab(index: number): void {
    state.activeTabIndex = index;
    saveEditorState(state);
    render();
    void uploadGameFile(getActiveTab().text);
  }

  function addTab(): void {
    state.tabs.push({
      name: `tab ${state.tabs.length}`,
      text: getActiveTab().text,
    });
    state.activeTabIndex = state.tabs.length - 1;
    saveEditorState(state);
    render();
    void uploadGameFile(getActiveTab().text);
  }

  function deleteTab(index: number): void {
    state.tabs.splice(index, 1);

    if (state.activeTabIndex > index) {
      state.activeTabIndex -= 1;
    } else if (state.activeTabIndex === index) {
      state.activeTabIndex = Math.min(index, state.tabs.length - 1);
    }

    saveEditorState(state);
    render();
    void uploadGameFile(getActiveTab().text);
  }
}

function loadEditorState(): EditorState {
  const savedState = JSON.parse(
    localStorage.getItem(storageKey) ?? '{"activeTabIndex":1,"tabs":[]}',
  ) as StoredEditorState;

  return {
    activeTabIndex: savedState.activeTabIndex,
    tabs: [...startingTabs.map((tab) => ({ ...tab })), ...savedState.tabs],
  };
}

function saveEditorState(state: EditorState): void {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      activeTabIndex: state.activeTabIndex,
      tabs: state.tabs.slice(startingTabs.length),
    } satisfies StoredEditorState),
  );
}

async function uploadGameFile(text: string): Promise<void> {
  const response = await fetch("/api/gamefile", {
    method: "PUT",
    headers: {
      "Content-Type": "text/plain",
    },
    body: text,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

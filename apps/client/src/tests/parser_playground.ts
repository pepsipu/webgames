import { parseGameFile } from "@webgame/parser";

// http://localhost:5173/src/tests/parser_playground.html

const textarea = document.querySelector<HTMLTextAreaElement>("#source");
const parseButton = document.querySelector<HTMLButtonElement>("#parse");
const output = document.querySelector<HTMLPreElement>("#output");

if (!textarea || !parseButton || !output) {
  throw new Error("Parser playground page is missing expected elements.");
}

parseButton.addEventListener("click", () => {
  try {
    const parsed = parseGameFile(textarea.value);
    const pretty = JSON.stringify(parsed, null, 2);

    output.textContent = pretty;
    console.log("Parsed gamefile:", parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.textContent = `Parse failed: ${message}`;
    console.error("Failed to parse gamefile:", error);
  }
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGameFile, parseGameFiles } from "./parser";

describe("parseGameFile", () => {
  it("parses apps/client/src/tests/other_example.html", () => {
    const filePath = resolve(
      import.meta.dirname,
      "../../../apps/client/src/tests/other_example.html",
    );

    const source = readFileSync(filePath, "utf8");
    const parsed = parseGameFile(source);

    expect(parsed.info.name).toBe("my awesome game");
    expect(parsed.info.author).toBe("pepsi");

    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.scenes[0]?.attributes).toEqual({}); // the <scene> element doesn't have any attributes in this example
    expect(parsed.scenes[0]?.objects.map((object) => object.type)).toEqual([
      "box",
      "tube",
      "ball",
    ]);
    expect(parsed.scenes[0]?.objects[0]?.attributes.id).toBe("coolbox");

    expect(parsed.ui).toHaveLength(1);
    expect(parsed.ui[0]?.elements[0]?.type).toBe("button");
    expect(parsed.ui[0]?.elements[0]?.attributes.id).toBe("weso");

    expect(parsed.scripts).toHaveLength(2);
    expect(parsed.scripts[0]?.local).toBe(true);
    expect(parsed.scripts[1]?.local).toBe(false);
  });

  it("preserves empty scene and ui blocks", () => {
    const parsed = parseGameFile(`
      <game name="empty blocks">
        <scene></scene>
        <ui></ui>
        <script></script>
      </game>
    `);

    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.scenes[0]).toEqual({
      attributes: {},
      objects: [],
    });

    expect(parsed.ui).toHaveLength(1);
    expect(parsed.ui[0]).toEqual({
      attributes: {},
      elements: [],
    });

    expect(parsed.scripts).toHaveLength(1);
    expect(parsed.scripts[0]).toEqual({
      attributes: {},
      code: "",
      local: false,
    });
  });

  it("supports multiple top-level game blocks", () => {
    const source = `<game name="game 1"></game><game name="game 2"></game>`;

    const first = parseGameFile(source);
    expect(first.info.name).toBe("game 1");

    const all = parseGameFiles(source);
    expect(all).toHaveLength(2);
    expect(all[0]?.info.name).toBe("game 1");
    expect(all[1]?.info.name).toBe("game 2");
  });
});

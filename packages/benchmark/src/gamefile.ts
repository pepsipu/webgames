const benchmarkSceneBoxCount = 120;
const benchmarkGridWidth = 12;

export function createBenchmarkGameFile(): string {
  const lines = [
    '<game name="client benchmark" author="webgame">',
    '  <camera id="camera" position="0 0 20"></camera>',
  ];

  for (let index = 0; index < benchmarkSceneBoxCount; index += 1) {
    const column = index % benchmarkGridWidth;
    const row = Math.floor(index / benchmarkGridWidth);
    const x = (column - (benchmarkGridWidth - 1) * 0.5) * 1.5;
    const y = (row - 4.5) * 1.5;

    lines.push(
      `  <box id="box-${index}" position="${x} ${y} 0" width="0.9" height="0.9" depth="0.9"></box>`,
    );
  }

  lines.push("  <script>");
  lines.push("    const boxes = [];");
  lines.push("    let index = 0;");
  lines.push(`    while (index !== ${benchmarkSceneBoxCount}) {`);
  lines.push("      const box = document.getElementById(`box-${index}`);");
  lines.push("      if (box !== null) {");
  lines.push("        boxes.push(box);");
  lines.push("      }");
  lines.push("      index += 1;");
  lines.push("    }");
  lines.push("    let seconds = 0;");
  lines.push("    function tick(deltaTime) {");
  lines.push("      seconds += deltaTime;");
  lines.push("      let boxIndex = 0;");
  lines.push("      while (boxIndex !== boxes.length) {");
  lines.push("        const box = boxes[boxIndex];");
  lines.push("        const angle = seconds + boxIndex * 0.05;");
  lines.push(
    "        box.transform.setRotationFromEuler(angle * 0.4, angle * 0.6, angle);",
  );
  lines.push("        box.material.setColor(");
  lines.push("          0.5 + 0.5 * Math.sin(angle),");
  lines.push("          0.5 + 0.5 * Math.sin(angle + 2),");
  lines.push("          0.5 + 0.5 * Math.sin(angle + 4),");
  lines.push("        );");
  lines.push("        boxIndex += 1;");
  lines.push("      }");
  lines.push("    }");
  lines.push("  </script>");
  lines.push("</game>");

  return lines.join("\n");
}

export { benchmarkSceneBoxCount };

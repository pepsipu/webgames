import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { instance } from "@viz-js/viz";

const rootDirectory = fileURLToPath(new URL("../", import.meta.url));
const outputPath = fileURLToPath(
  new URL("./dependency-graph.svg", import.meta.url),
);
const ignoredDirectories = new Set([".git", "dist", "node_modules"]);
const sourceExtensions = new Set([
  ".cjs",
  ".css",
  ".cts",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
  ".xml",
]);
const importExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
const categoryStyles = {
  app: {
    edge: "#2563eb",
    fill: "#dbeafe",
    stroke: "#1d4ed8",
  },
  package: {
    edge: "#059669",
    fill: "#d1fae5",
    stroke: "#047857",
  },
  system: {
    edge: "#d97706",
    fill: "#ffedd5",
    stroke: "#c2410c",
  },
};
const sourcePatterns = [
  /\bimport\s+(?:type\s+)?(?:(?:[\w*\s{},]+)\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

await main();

async function main() {
  const workspacePackages = await discoverWorkspacePackages();
  const localPackageNames = workspacePackages
    .map((workspacePackage) => workspacePackage.name)
    .sort((left, right) => {
      return right.length - left.length;
    });

  for (const workspacePackage of workspacePackages) {
    const sourceFiles = await collectFiles(workspacePackage.sourceDirectory);
    workspacePackage.loc = await countLinesOfCode(sourceFiles);
    workspacePackage.dependencies = await collectDependencies(
      sourceFiles,
      localPackageNames,
      workspacePackage.name,
    );
  }

  const viz = await instance();
  const svg = viz.renderString(createDot(workspacePackages), {
    engine: "dot",
    format: "svg",
  });

  await writeFile(outputPath, `${svg.trim()}\n`);
  process.stdout.write(
    `wrote ${toPosixPath(path.relative(rootDirectory, outputPath))}\n`,
  );
}

async function discoverWorkspacePackages() {
  const directories = [];

  for (const rootName of ["apps", "packages"]) {
    await walkDirectories(path.join(rootDirectory, rootName), directories);
  }

  const workspacePackages = [];

  for (const directory of directories.sort()) {
    const packageJsonPath = path.join(directory, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

    workspacePackages.push({
      category: getCategory(directory),
      dependencies: [],
      label: getPackageLabel(packageJson.name, directory),
      loc: 0,
      name: packageJson.name,
      relativePath: toPosixPath(path.relative(rootDirectory, directory)),
      sourceDirectory: path.join(directory, "src"),
    });
  }

  return workspacePackages;
}

async function walkDirectories(directory, directories) {
  const entries = await readdir(directory, { withFileTypes: true });

  if (
    entries.some((entry) => entry.isFile() && entry.name === "package.json")
  ) {
    directories.push(directory);
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) {
      continue;
    }

    await walkDirectories(path.join(directory, entry.name), directories);
  }
}

async function collectFiles(directory) {
  const files = [];

  await walkFiles(directory, files);

  return files.sort();
}

async function walkFiles(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await walkFiles(filePath, files);
      }

      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(filePath);
    }
  }
}

async function countLinesOfCode(files) {
  let total = 0;

  for (const file of files) {
    total += countLines(await readFile(file, "utf8"));
  }

  return total;
}

async function collectDependencies(files, localPackageNames, packageName) {
  const dependencies = new Set();

  for (const file of files) {
    if (!importExtensions.has(path.extname(file))) {
      continue;
    }

    const source = await readFile(file, "utf8");

    for (const sourcePattern of sourcePatterns) {
      for (const match of source.matchAll(sourcePattern)) {
        const dependency = resolveLocalPackage(match[1], localPackageNames);

        if (dependency && dependency !== packageName) {
          dependencies.add(dependency);
        }
      }
    }
  }

  return [...dependencies].sort();
}

function resolveLocalPackage(specifier, localPackageNames) {
  for (const packageName of localPackageNames) {
    if (specifier === packageName || specifier.startsWith(`${packageName}/`)) {
      return packageName;
    }
  }

  return null;
}

function createDot(workspacePackages) {
  const lines = [
    "digraph dependencies {",
    '  graph [rankdir=LR, bgcolor="white", pad=0.3, nodesep=0.5, ranksep=0.9, splines=true];',
    '  node [shape=box, style="rounded,filled", fontname="Helvetica", fontsize=12, penwidth=2, margin="0.16,0.12"];',
    "  edge [arrowhead=normal, arrowsize=0.8, penwidth=1.6];",
  ];

  for (const workspacePackage of [...workspacePackages].sort(comparePackages)) {
    const style = categoryStyles[workspacePackage.category];

    lines.push(
      `  ${getNodeId(workspacePackage.name)} [label=<${createLabel(workspacePackage)}>, fillcolor="${style.fill}", color="${style.stroke}", fontcolor="#0f172a", width=${getNodeWidth(workspacePackage.loc)}, height=${getNodeHeight(workspacePackage.loc)}];`,
    );
  }

  lines.push("");

  for (const workspacePackage of [...workspacePackages].sort(comparePackages)) {
    const style = categoryStyles[workspacePackage.category];

    for (const dependency of workspacePackage.dependencies) {
      lines.push(
        `  ${getNodeId(workspacePackage.name)} -> ${getNodeId(dependency)} [color="${style.edge}"];`,
      );
    }
  }

  lines.push("}");

  return lines.join("\n");
}

function createLabel(workspacePackage) {
  return [
    '<TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">',
    `  <TR><TD><B>${escapeHtml(workspacePackage.label)}</B></TD></TR>`,
    `  <TR><TD><FONT POINT-SIZE="10">${escapeHtml(workspacePackage.relativePath)}</FONT></TD></TR>`,
    `  <TR><TD><FONT POINT-SIZE="10">${workspacePackage.loc} LOC</FONT></TD></TR>`,
    "</TABLE>",
  ].join("");
}

function comparePackages(left, right) {
  const categoryOrder = {
    app: 0,
    package: 1,
    system: 2,
  };

  return (
    categoryOrder[left.category] - categoryOrder[right.category] ||
    left.relativePath.localeCompare(right.relativePath)
  );
}

function getCategory(directory) {
  const relativePath = toPosixPath(path.relative(rootDirectory, directory));

  if (relativePath.startsWith("apps/")) {
    return "app";
  }

  if (relativePath.startsWith("packages/systems/")) {
    return "system";
  }

  return "package";
}

function getPackageLabel(packageName, directory) {
  const label = packageName.split("/").pop();

  if (label) {
    return label;
  }

  return path.basename(directory);
}

function getNodeId(packageName) {
  return packageName.replaceAll(/[^a-zA-Z0-9]+/g, "_");
}

function getNodeWidth(loc) {
  return (1.8 + Math.sqrt(Math.max(loc, 1)) / 10).toFixed(2);
}

function getNodeHeight(loc) {
  return (0.8 + Math.sqrt(Math.max(loc, 1)) / 18).toFixed(2);
}

function countLines(source) {
  if (source.length === 0) {
    return 0;
  }

  const newlineCount = source.match(/\n/g)?.length ?? 0;

  if (source.endsWith("\n")) {
    return newlineCount;
  }

  return newlineCount + 1;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join(path.posix.sep);
}

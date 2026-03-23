import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const rootDirectory = new URL("../../../", import.meta.url);
const benchmarkDirectory = new URL(
  "../../../artifacts/client-benchmark/",
  import.meta.url,
);
const previewUrl = "http://127.0.0.1:4173";
const benchmarkUrl = `${previewUrl}/?run=${Date.now()}`;

await runCommand("pnpm", ["--filter", "@webgames/benchmark", "build"]);

const previewProcess = spawn(
  "pnpm",
  [
    "--filter",
    "@webgames/benchmark",
    "exec",
    "vite",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
  ],
  {
    cwd: rootDirectory,
    detached: process.platform !== "win32",
    stdio: "inherit",
  },
);

try {
  await waitForHttp(previewUrl);

  const browser = await chromium.launch({
    args: ["--enable-precise-memory-info"],
  });
  const context = await browser.newContext({
    serviceWorkers: "block",
  });

  try {
    const page = await context.newPage();
    const session = await context.newCDPSession(page);

    await session.send("Network.enable");
    await session.send("Network.setCacheDisabled", {
      cacheDisabled: true,
    });

    const ready = page.waitForFunction(
      () => {
        return (
          window.__webgamesBenchmarkError !== undefined ||
          window.__webgamesBenchmarkReadyMs !== undefined
        );
      },
      { timeout: 60_000 },
    );

    await page.goto(benchmarkUrl, { waitUntil: "commit" });
    await ready;
    await page.waitForFunction(
      () => {
        return (
          window.__webgamesBenchmarkError !== undefined ||
          window.__webgamesBenchmarkResult !== undefined
        );
      },
      { timeout: 60_000 },
    );

    const error = await page.evaluate(() => {
      return window.__webgamesBenchmarkError;
    });

    if (error !== undefined) {
      throw new Error(error);
    }

    const result = await page.evaluate(() => {
      return window.__webgamesBenchmarkResult;
    });

    if (result === undefined) {
      throw new Error("Client benchmark did not produce a result.");
    }

    await mkdir(benchmarkDirectory, { recursive: true });
    await writeFile(
      new URL("result.json", benchmarkDirectory),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    await writeFile(
      new URL("summary.md", benchmarkDirectory),
      createSummary(result),
    );

    process.stdout.write(createSummary(result));
  } finally {
    await context.close();
    await browser.close();
  }
} finally {
  stopProcess(previewProcess);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDirectory,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`${command} ${args.join(" ")} exited with code ${code}.`),
      );
    });
  });
}

async function waitForHttp(url) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

function stopProcess(child) {
  if (child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    child.kill("SIGTERM");
    return;
  }

  process.kill(-child.pid, "SIGTERM");
}

function createSummary(result) {
  return [
    "# Client Benchmark",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Page load to engine ready | ${formatMilliseconds(result.pageLoadToEngineReadyMs)} |`,
    `| Engine load | ${formatMilliseconds(result.engineLoadMs)} |`,
    `| Script init | ${formatMilliseconds(result.scriptInitMs)} |`,
    `| Tick duration | ${formatMilliseconds(result.tickDurationMs)} for ${result.tickCount} ticks |`,
    `| Tick throughput | ${result.ticksPerSecond.toFixed(2)} ticks/s |`,
    `| JS heap before | ${formatMegabytes(result.heapUsedBeforeBytes)} |`,
    `| JS heap after | ${formatMegabytes(result.heapUsedAfterBytes)} |`,
    `| JS heap delta | ${formatMegabytes(result.heapDeltaBytes)} |`,
    `| Scene boxes | ${result.sceneBoxCount} |`,
    `| Total elements | ${result.elementCount} |`,
    "",
  ].join("\n");
}

function formatMilliseconds(value) {
  return `${value.toFixed(2)} ms`;
}

function formatMegabytes(value) {
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const rootDirectory = new URL("../", import.meta.url);
const clientDirectory = new URL("../apps/client/", import.meta.url);
const serverDirectory = new URL("../apps/server/", import.meta.url);
const benchmarkDirectory = new URL(
  "../artifacts/client-benchmark/",
  import.meta.url,
);
const serverPort = 8788;
const serverUrl = `http://127.0.0.1:${serverPort}`;
const previewUrl = "http://127.0.0.1:4173";
const benchmarkUrl = `${previewUrl}/?run=${Date.now()}`;
const tickSampleDurationMs = 10_000;
const warmupDurationMs = 1_000;

await runCommand("pnpm", ["--filter", "@webgames/server", "build"]);
await runCommand("pnpm", ["--filter", "@webgames/client", "build"]);

const serverProcess = spawn("node", ["--import", "tsx", "dist/index.js"], {
  cwd: serverDirectory,
  detached: process.platform !== "win32",
  env: {
    ...process.env,
    PORT: String(serverPort),
  },
  stdio: "inherit",
});
const previewProcess = spawn(
  "pnpm",
  ["exec", "vite", "preview", "--host", "127.0.0.1", "--port", "4173"],
  {
    cwd: clientDirectory,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      WEBGAMES_SERVER_URL: serverUrl,
    },
    stdio: "inherit",
  },
);

try {
  await waitForHttp(serverUrl);
  await waitForHttp(previewUrl);

  const browser = await chromium.launch({
    args: ["--enable-precise-memory-info", "--enable-unsafe-webgpu"],
  });
  const context = await browser.newContext({
    serviceWorkers: "block",
  });

  try {
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    const firstSnapshot = waitForWebSocketFrame(session);

    await page.addInitScript(() => {
      const originalRequestAnimationFrame =
        window.requestAnimationFrame.bind(window);

      window.__webgamesBenchmarkTickDurationsMs = [];
      window.requestAnimationFrame = (callback) => {
        return originalRequestAnimationFrame((time) => {
          const startedAt = performance.now();

          callback(time);
          window.__webgamesBenchmarkTickDurationsMs.push(
            performance.now() - startedAt,
          );
        });
      };
    });

    await session.send("Network.enable");
    await session.send("Network.setCacheDisabled", {
      cacheDisabled: true,
    });
    await session.send("Performance.enable");

    await page.goto(benchmarkUrl, { waitUntil: "load" });
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector("canvas");

        return (
          canvas instanceof HTMLCanvasElement &&
          canvas.width > 0 &&
          canvas.height > 0
        );
      },
      { timeout: 60_000 },
    );
    await firstSnapshot;

    const pageLoadToFirstSnapshotMs = await page.evaluate(() => {
      return performance.now();
    });
    const navigationMetrics = await page.evaluate(() => {
      const [navigationEntry] = performance.getEntriesByType("navigation");
      const canvas = document.querySelector("canvas");

      if (!(navigationEntry instanceof PerformanceNavigationTiming)) {
        throw new Error("Navigation timing entry is not available.");
      }

      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Canvas element not found.");
      }

      return {
        domContentLoadedMs: navigationEntry.domContentLoadedEventEnd,
        loadEventMs: navigationEntry.loadEventEnd,
        domNodeCount: document.getElementsByTagName("*").length,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      };
    });

    await page.waitForTimeout(warmupDurationMs);

    const heapUsedBeforeBytes = await getHeapUsedBytes(page);
    const taskDurationBeforeMs = await getTaskDurationMs(session);
    const tickSample = await page.evaluate(async (durationMs) => {
      window.__webgamesBenchmarkTickDurationsMs = [];

      const startedAt = performance.now();

      await new Promise((resolve) => {
        setTimeout(resolve, durationMs);
      });

      const tickSampleDurationMs = performance.now() - startedAt;
      const tickDurationsMs = window.__webgamesBenchmarkTickDurationsMs
        .slice()
        .sort((left, right) => left - right);

      if (tickDurationsMs.length === 0) {
        throw new Error("No client ticks were observed during the sample.");
      }

      const totalTickDurationMs = tickDurationsMs.reduce((sum, value) => {
        return sum + value;
      }, 0);
      const p95TickDurationMs =
        tickDurationsMs[Math.ceil(tickDurationsMs.length * 0.95) - 1];

      return {
        tickCount: tickDurationsMs.length,
        tickSampleDurationMs,
        averageTickDurationMs: totalTickDurationMs / tickDurationsMs.length,
        p95TickDurationMs,
        maxTickDurationMs: tickDurationsMs[tickDurationsMs.length - 1],
      };
    }, tickSampleDurationMs);
    const taskDurationAfterMs = await getTaskDurationMs(session);
    const heapUsedAfterBytes = await getHeapUsedBytes(page);
    const result = {
      benchmarkVersion: 1,
      domContentLoadedMs: navigationMetrics.domContentLoadedMs,
      loadEventMs: navigationMetrics.loadEventMs,
      pageLoadToFirstSnapshotMs,
      warmupDurationMs,
      tickCount: tickSample.tickCount,
      tickSampleDurationMs: tickSample.tickSampleDurationMs,
      averageTickDurationMs: tickSample.averageTickDurationMs,
      p95TickDurationMs: tickSample.p95TickDurationMs,
      maxTickDurationMs: tickSample.maxTickDurationMs,
      mainThreadTaskDurationMs: taskDurationAfterMs - taskDurationBeforeMs,
      heapUsedBeforeBytes,
      heapUsedAfterBytes,
      heapDeltaBytes: heapUsedAfterBytes - heapUsedBeforeBytes,
      domNodeCount: navigationMetrics.domNodeCount,
      canvasWidth: navigationMetrics.canvasWidth,
      canvasHeight: navigationMetrics.canvasHeight,
    };

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
  stopProcess(serverProcess);
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
      await fetch(url);
      return;
    } catch {}

    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

function waitForWebSocketFrame(session) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      session.off("Network.webSocketFrameReceived", onFrame);
      reject(new Error("Timed out waiting for the first WebSocket frame."));
    }, 60_000);

    function onFrame() {
      clearTimeout(timeout);
      session.off("Network.webSocketFrameReceived", onFrame);
      resolve();
    }

    session.on("Network.webSocketFrameReceived", onFrame);
  });
}

async function getHeapUsedBytes(page) {
  return await page.evaluate(() => {
    const memory = performance.memory;

    if (memory === undefined) {
      throw new Error("performance.memory is not available.");
    }

    return memory.usedJSHeapSize;
  });
}

async function getTaskDurationMs(session) {
  const { metrics } = await session.send("Performance.getMetrics");

  return getMetricValue(metrics, "TaskDuration") * 1000;
}

function getMetricValue(metrics, name) {
  const metric = metrics.find((entry) => entry.name === name);

  if (metric === undefined) {
    throw new Error(`CDP metric ${name} is not available.`);
  }

  return metric.value;
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
    `| DOM content loaded | ${formatMilliseconds(result.domContentLoadedMs)} |`,
    `| Load event | ${formatMilliseconds(result.loadEventMs)} |`,
    `| First snapshot received | ${formatMilliseconds(result.pageLoadToFirstSnapshotMs)} |`,
    `| Tick sample | ${formatMilliseconds(result.tickSampleDurationMs)} over ${result.tickCount} ticks |`,
    `| Average tick duration | ${formatMilliseconds(result.averageTickDurationMs)} |`,
    `| P95 tick duration | ${formatMilliseconds(result.p95TickDurationMs)} |`,
    `| Max tick duration | ${formatMilliseconds(result.maxTickDurationMs)} |`,
    `| Main thread task time | ${formatMilliseconds(result.mainThreadTaskDurationMs)} |`,
    `| JS heap before | ${formatMegabytes(result.heapUsedBeforeBytes)} |`,
    `| JS heap after | ${formatMegabytes(result.heapUsedAfterBytes)} |`,
    `| JS heap delta | ${formatMegabytes(result.heapDeltaBytes)} |`,
    `| DOM nodes | ${result.domNodeCount} |`,
    `| Canvas size | ${result.canvasWidth}x${result.canvasHeight} |`,
    "",
  ].join("\n");
}

function formatMilliseconds(value) {
  return `${value.toFixed(2)} ms`;
}

function formatMegabytes(value) {
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

import { Engine, type Element } from "@webgames/engine";
import { loadGameFile } from "@webgames/parser";
import { scriptSystem } from "@webgames/script";
import { benchmarkSceneBoxCount, createBenchmarkGameFile } from "./gamefile";

const benchmarkDeltaTime = 1 / 60;
const benchmarkTargetDurationMs = 10_000;

interface PerformanceMemory {
  readonly usedJSHeapSize: number;
}

interface PerformanceWithMemory extends Performance {
  readonly memory?: PerformanceMemory;
}

export interface ClientBenchmarkResult {
  readonly benchmarkVersion: 1;
  readonly pageLoadToEngineReadyMs: number;
  readonly engineLoadMs: number;
  readonly scriptInitMs: number;
  readonly tickCount: number;
  readonly tickDurationMs: number;
  readonly ticksPerSecond: number;
  readonly tickDeltaTimeMs: number;
  readonly heapUsedBeforeBytes: number;
  readonly heapUsedAfterBytes: number;
  readonly heapDeltaBytes: number;
  readonly sceneBoxCount: number;
  readonly elementCount: number;
}

declare global {
  interface Window {
    __webgamesBenchmarkError?: string;
    __webgamesBenchmarkReadyMs?: number;
    __webgamesBenchmarkResult?: ClientBenchmarkResult;
  }
}

export async function runClientBenchmark(app: HTMLDivElement): Promise<void> {
  const resultElement = document.createElement("pre");
  resultElement.id = "benchmark-results";
  app.replaceChildren(resultElement);

  try {
    const result = benchmarkClient();

    window.__webgamesBenchmarkResult = result;
    resultElement.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);

    window.__webgamesBenchmarkError = message;
    resultElement.textContent = message;

    throw error;
  }
}

function benchmarkClient(): ClientBenchmarkResult {
  const gameFile = createBenchmarkGameFile();
  const heapUsedBeforeBytes = getHeapUsedBytes();

  const loadStartedAt = performance.now();
  const engine = new Engine([scriptSystem]);

  loadGameFile(engine, gameFile);

  const engineLoadMs = performance.now() - loadStartedAt;
  const elementCount = countElements(engine.document);

  const scriptInitStartedAt = performance.now();

  engine.tick(0);

  const scriptInitMs = performance.now() - scriptInitStartedAt;
  const pageLoadToEngineReadyMs = performance.now();

  window.__webgamesBenchmarkReadyMs = pageLoadToEngineReadyMs;

  const tickStartedAt = performance.now();
  let tickCount = 0;
  let tickDurationMs = 0;

  while (tickDurationMs < benchmarkTargetDurationMs) {
    engine.tick(benchmarkDeltaTime);
    tickCount += 1;
    tickDurationMs = performance.now() - tickStartedAt;
  }

  const heapUsedAfterBytes = getHeapUsedBytes();

  engine.destroy();

  return {
    benchmarkVersion: 1,
    pageLoadToEngineReadyMs,
    engineLoadMs,
    scriptInitMs,
    tickCount,
    tickDurationMs,
    ticksPerSecond: tickCount / (tickDurationMs / 1000),
    tickDeltaTimeMs: benchmarkDeltaTime * 1000,
    heapUsedBeforeBytes,
    heapUsedAfterBytes,
    heapDeltaBytes: heapUsedAfterBytes - heapUsedBeforeBytes,
    sceneBoxCount: benchmarkSceneBoxCount,
    elementCount,
  };
}

function getHeapUsedBytes(): number {
  const memory = (performance as PerformanceWithMemory).memory;

  if (memory === undefined) {
    throw new Error("performance.memory is not available.");
  }

  return memory.usedJSHeapSize;
}

function countElements(root: Element): number {
  let count = 1;

  for (const child of root.children) {
    count += countElements(child);
  }

  return count;
}

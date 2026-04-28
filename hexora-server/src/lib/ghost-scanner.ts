import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import path from "node:path";
import { getChainConfig, type ScannerChain } from "./runtime-config";

export interface RustScannerStatus {
  chain: ScannerChain;
  running: boolean;
  chainId: number;
  endpointCount: number;
  healthyEndpoints: number;
  processedTransactions: number;
  flaggedContracts: number;
  uptime: string;
  anvilConnected: boolean;
}

export interface RustEndpointHealth {
  endpoint: string;
  isHealthy: boolean;
  failures: number;
  requestsServed: number;
  avgLatencyMs: number;
}

export interface RustVulnerabilityReport {
  id: string;
  chain: ScannerChain;
  contractAddress: string;
  txHash: string;
  severity: string;
  kind: string;
  description: string;
  functionSelector: string | null;
  flaggedSelectors: string[];
  stateDelta: string | null;
  timestamp: string;
  forkValidated: boolean;
  confidenceScore: number;
  proxy?: {
    proxyType?: string | null;
    implementation?: string | null;
    admin?: string | null;
    beacon?: string | null;
    isAccessControlled: boolean;
  } | null;
  exploitPaths: Array<{
    entrySelector: string;
    probability: number;
    economicValueEth: number;
    requiredConditions: string[];
    stateChanges: string[];
    pocCalldata: string;
  }>;
  mevOpportunities: Array<{
    mevType: string;
    estimatedProfitEth: number;
    competitionScore: number;
    suggestedTipBps: number;
  }>;
  exploitationProbability: number;
  riskAdjustedValue: number;
  recommendation: string;
}

type RustEvent =
  | { type: "log"; message: string; level: "info" | "warn" | "success" | "error"; ts: string }
  | { type: "step"; id: string; label: string; status: "running" | "done" | "skipped" | "error" }
  | { type: "complete"; report: RustVulnerabilityReport }
  | { type: "error"; message: string };

type ScanMode = "fast" | "deep";
type ForkMode = "auto" | "force" | "off";

interface SpawnedRustScanner {
  child: ReturnType<typeof spawn>;
  commandLabel: string;
}

let localRustScannerBuild: Promise<string> | null = null;

function getScannerCwd(): string {
  return path.resolve(process.cwd(), "..", "ghost-scanner");
}

function getScannerBinaryPath(scannerCwd: string): string {
  const exeName = process.platform === "win32" ? "ghost-scanner.exe" : "ghost-scanner";
  const releaseBin = path.join(scannerCwd, "target", "release", exeName);
  if (existsSync(releaseBin)) {
    return releaseBin;
  }

  return path.join(scannerCwd, "target", "debug", exeName);
}

async function ensureLocalRustScannerBinary(scannerCwd: string): Promise<string> {
  const existingBinary = getScannerBinaryPath(scannerCwd);
  if (existsSync(existingBinary)) {
    return existingBinary;
  }

  if (!localRustScannerBuild) {
    localRustScannerBuild = (async () => {
      const binaryPath = getScannerBinaryPath(scannerCwd);
      const child = spawn("cargo", ["build", "--quiet"], {
        cwd: scannerCwd,
        env: process.env,
        stdio: ["ignore", "ignore", "pipe"],
      });

      if (!child.stderr) {
        throw new Error("Rust scanner build pipe is unavailable");
      }

      let stderrBuffer = "";
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        stderrBuffer += chunk;
      });

      const [code] = (await once(child, "close")) as [number | null];
      if (code !== 0) {
        localRustScannerBuild = null;
        throw new Error(`Failed to build local Rust scanner: ${stderrBuffer.trim() || "unknown error"}`);
      }

      if (!existsSync(binaryPath)) {
        localRustScannerBuild = null;
        throw new Error(`Local Rust scanner build completed but binary was not found at ${binaryPath}`);
      }

      return binaryPath;
    })();
  }

  return localRustScannerBuild;
}

async function getRustScannerCommand(chain: ScannerChain, args: string[]): Promise<SpawnedRustScanner> {
  const ghostScannerBin = process.env.GHOST_SCANNER_BIN?.trim();
  const scannerCwd = getScannerCwd();
  const config = getChainConfig(chain);
  const env = {
    ...process.env,
    SCANNER_CHAIN: chain,
    SCANNER_CHAIN_ID: String(config.chainId),
    ANVIL_RPC_URL: config.anvilUrl,
    RPC_HTTP_ENDPOINTS: config.httpEndpoints.map((endpoint) => endpoint.url).join(","),
    RPC_WS_ENDPOINTS: config.wsEndpoints.map((endpoint) => endpoint.url).join(","),
  };

  if (ghostScannerBin) {
    return {
      child: spawn(ghostScannerBin, args, {
        cwd: scannerCwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      }),
      commandLabel: `${ghostScannerBin} ${args.join(" ")}`.trim(),
    };
  }

  const localBinary = await ensureLocalRustScannerBinary(scannerCwd);
  return {
    child: spawn(localBinary, args, {
      cwd: scannerCwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    }),
    commandLabel: `${localBinary} ${args.join(" ")}`.trim(),
  };
}

function parseJsonLine<T>(line: string, commandLabel: string): T {
  try {
    return JSON.parse(line) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse Rust scanner output from "${commandLabel}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function getPipes(
  child: ReturnType<typeof spawn>,
  commandLabel: string,
): { stdout: NonNullable<typeof child.stdout>; stderr: NonNullable<typeof child.stderr> } {
  if (!child.stdout || !child.stderr) {
    throw new Error(`Rust scanner pipes are unavailable for ${commandLabel}`);
  }

  return {
    stdout: child.stdout,
    stderr: child.stderr,
  };
}

export async function getRustScannerStatus(chain: ScannerChain): Promise<RustScannerStatus> {
  const { child, commandLabel } = await getRustScannerCommand(chain, ["status"]);
  const { stdout: stdoutPipe, stderr: stderrPipe } = getPipes(child, commandLabel);
  let stdoutBuffer = "";
  let stderrBuffer = "";

  stdoutPipe.setEncoding("utf8");
  stderrPipe.setEncoding("utf8");
  stdoutPipe.on("data", (chunk) => {
    stdoutBuffer += chunk;
  });
  stderrPipe.on("data", (chunk) => {
    stderrBuffer += chunk;
  });

  const [code] = (await once(child, "close")) as [number | null];
  if (code !== 0) {
    throw new Error(
      `Rust scanner command failed (${commandLabel}): ${stderrBuffer.trim() || stdoutBuffer.trim()}`,
    );
  }

  const line = stdoutBuffer.trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) {
    throw new Error(`Rust scanner returned empty output for ${commandLabel}`);
  }

  return parseJsonLine<RustScannerStatus>(line, commandLabel);
}

export async function getRustScannerEndpoints(chain: ScannerChain): Promise<RustEndpointHealth[]> {
  const { child, commandLabel } = await getRustScannerCommand(chain, ["endpoints"]);
  const { stdout: stdoutPipe, stderr: stderrPipe } = getPipes(child, commandLabel);
  let stdoutBuffer = "";
  let stderrBuffer = "";

  stdoutPipe.setEncoding("utf8");
  stderrPipe.setEncoding("utf8");
  stdoutPipe.on("data", (chunk) => {
    stdoutBuffer += chunk;
  });
  stderrPipe.on("data", (chunk) => {
    stderrBuffer += chunk;
  });

  const [code] = (await once(child, "close")) as [number | null];
  if (code !== 0) {
    throw new Error(
      `Rust scanner command failed (${commandLabel}): ${stderrBuffer.trim() || stdoutBuffer.trim()}`,
    );
  }

  const line = stdoutBuffer.trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) {
    throw new Error(`Rust scanner returned empty output for ${commandLabel}`);
  }

  return parseJsonLine<RustEndpointHealth[]>(line, commandLabel);
}

export async function runRustScanner(
  params: {
    chain: ScannerChain;
    contractAddress: string;
    mode: ScanMode;
    simulation: boolean;
    fork: ForkMode;
  },
  onEvent: (event: RustEvent) => Promise<void> | void,
): Promise<RustVulnerabilityReport> {
  const { child, commandLabel } = await getRustScannerCommand(params.chain, [
    "scan",
    "--contract-address",
    params.contractAddress,
    "--mode",
    params.mode,
    "--simulation",
    String(params.simulation),
    "--fork",
    params.fork,
  ]);
  const { stdout: stdoutPipe, stderr: stderrPipe } = getPipes(child, commandLabel);

  stdoutPipe.setEncoding("utf8");
  stderrPipe.setEncoding("utf8");

  let stdoutBuffer = "";
  let stderrBuffer = "";
  let report: RustVulnerabilityReport | null = null;
  let handlerError: Error | null = null;

  stdoutPipe.on("data", async (chunk: string) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim() || handlerError) {
        continue;
      }

      try {
        const event = parseJsonLine<RustEvent>(line, commandLabel);
        if (event.type === "complete") {
          report = event.report;
        }
        await onEvent(event);
      } catch (error) {
        handlerError = error instanceof Error ? error : new Error(String(error));
        child.kill();
        break;
      }
    }
  });

  stderrPipe.on("data", (chunk: string) => {
    stderrBuffer += chunk;
  });

  const [code] = (await once(child, "close")) as [number | null];
  if (handlerError) {
    throw handlerError;
  }

  if (code !== 0) {
    throw new Error(
      `Rust scanner command failed (${commandLabel}): ${stderrBuffer.trim() || "unknown error"}`,
    );
  }

  if (stdoutBuffer.trim()) {
    const trailingEvent = parseJsonLine<RustEvent>(stdoutBuffer.trim(), commandLabel);
    if (trailingEvent.type === "complete") {
      report = trailingEvent.report;
    }
    await onEvent(trailingEvent);
  }

  if (!report) {
    throw new Error(`Rust scanner did not emit a completion report for ${commandLabel}`);
  }

  return report;
}

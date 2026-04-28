import { Router } from "express";
import { and, count, countDistinct, eq } from "drizzle-orm";
import { db, vulnerabilityReportsTable } from "@workspace/db";
import {
  getRustScannerEndpoints,
  getRustScannerStatus,
  runRustScanner,
  type RustVulnerabilityReport,
} from "../lib/ghost-scanner";
import { defaultScannerChain, type ScannerChain } from "../lib/runtime-config";

const router = Router();
const startTime = Date.now();

type ScanMode = "fast" | "deep";
type ForkMode = "auto" | "force" | "off";
type StepStatus = "running" | "done" | "skipped" | "error";
type LogLevel = "info" | "warn" | "success" | "error";

function parseChain(value: unknown): ScannerChain {
  if (value === "arbitrum" || value === "bnb") {
    return value;
  }
  return "ethereum";
}

function isValidAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function getUptime(): string {
  const uptimeMs = Date.now() - startTime;
  const hours = Math.floor(uptimeMs / 3_600_000);
  const minutes = Math.floor((uptimeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((uptimeMs % 60_000) / 1_000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

async function getScannerCounts(chain: ScannerChain): Promise<{ processedTransactions: number; flaggedContracts: number }> {
  const [processedResult, flaggedResult] = await Promise.all([
    db
      .select({ value: count() })
      .from(vulnerabilityReportsTable)
      .where(eq(vulnerabilityReportsTable.chain, chain)),
    db
      .select({ value: countDistinct(vulnerabilityReportsTable.contractAddress) })
      .from(vulnerabilityReportsTable)
      .where(and(eq(vulnerabilityReportsTable.chain, chain), eq(vulnerabilityReportsTable.severity, "CRITICAL"))),
  ]);

  return {
    processedTransactions: processedResult[0]?.value ?? 0,
    flaggedContracts: flaggedResult[0]?.value ?? 0,
  };
}

async function persistRustReport(report: RustVulnerabilityReport): Promise<void> {
  await db
    .insert(vulnerabilityReportsTable)
    .values({
      id: report.id,
      chain: report.chain,
      contractAddress: report.contractAddress,
      txHash: report.txHash,
      severity: report.severity,
      kind: report.kind,
      description: report.description,
      functionSelector: report.functionSelector,
      flaggedSelectors: report.flaggedSelectors,
      stateDelta: report.stateDelta,
      forkValidated: report.forkValidated,
      confidenceScore: report.confidenceScore,
      timestamp: new Date(report.timestamp),
    })
    .onConflictDoNothing();
}

router.get("/scanner/status", async (req, res) => {
  try {
    const chain = parseChain(req.query.chain ?? defaultScannerChain);
    const [rustStatus, counts] = await Promise.all([getRustScannerStatus(chain), getScannerCounts(chain)]);

    res.json({
      chain: rustStatus.chain,
      running: rustStatus.running,
      chainId: rustStatus.chainId,
      endpointCount: rustStatus.endpointCount,
      healthyEndpoints: rustStatus.healthyEndpoints,
      processedTransactions: counts.processedTransactions,
      flaggedContracts: counts.flaggedContracts,
      uptime: getUptime(),
      anvilConnected: rustStatus.anvilConnected,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch scanner status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/scanner/endpoints", async (req, res) => {
  try {
    const chain = parseChain(req.query.chain ?? defaultScannerChain);
    const endpoints = await getRustScannerEndpoints(chain);
    res.json(endpoints);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch endpoints");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/scanner/run", async (req, res) => {
  const body = req.body ?? {};
  const chain = parseChain(body.chain ?? defaultScannerChain);
  const contractAddress = typeof body.contractAddress === "string" ? body.contractAddress.trim() : "";
  const mode: ScanMode = body.mode === "deep" ? "deep" : "fast";
  const simulation = body.simulation !== false;
  const fork: ForkMode = body.fork === "force" || body.fork === "off" ? body.fork : "auto";

  if (!isValidAddress(contractAddress)) {
    res.status(400).json({ error: "contractAddress must be a valid EVM address" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (type: string, data: object) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  const log = (message: string, level: LogLevel = "info") => {
    send("log", { message, level, ts: new Date().toISOString() });
  };

  const step = (id: string, label: string, status: StepStatus) => {
    send("step", { id, label, status });
  };

  try {
    const report = await runRustScanner(
      {
        contractAddress,
        chain,
        mode,
        simulation,
        fork,
      },
      async (event) => {
        if (event.type === "log") {
          send("log", {
            message: event.message,
            level: event.level,
            ts: event.ts,
          });
          return;
        }

        if (event.type === "step") {
          step(event.id, event.label, event.status);
          return;
        }

        if (event.type === "error") {
          send("error", { message: event.message });
        }
      },
    );

    await persistRustReport(report);
    log(`Report persisted to database with id ${report.id}`, "success");

    send("complete", {
      report,
    });
  } catch (err) {
    step("bytecode", "Fetch & decode bytecode", "error");
    send("error", {
      message: err instanceof Error ? err.message : "Scan failed",
    });
  } finally {
    res.end();
  }
});

export default router;

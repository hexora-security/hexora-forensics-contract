import { Router } from "express";
import { db } from "@workspace/db";
import { vulnerabilityReportsTable } from "@workspace/db";
import {
  CreateReportBody,
  ListReportsQueryParams,
  GetReportParams,
  GetRecentReportsQueryParams,
} from "@workspace/api-zod";
import { eq, desc, count, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/reports", async (req, res) => {
  try {
    const query = ListReportsQueryParams.parse(req.query);
    const { chain, severity, kind, limit, offset } = query;

    let conditions: ReturnType<typeof and>[] = [];

    if (chain) {
      conditions.push(eq(vulnerabilityReportsTable.chain, chain));
    }
    if (severity) {
      conditions.push(eq(vulnerabilityReportsTable.severity, severity));
    }
    if (kind) {
      conditions.push(eq(vulnerabilityReportsTable.kind, kind));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [reports, totalResult] = await Promise.all([
      db
        .select()
        .from(vulnerabilityReportsTable)
        .where(whereClause)
        .orderBy(desc(vulnerabilityReportsTable.timestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(vulnerabilityReportsTable)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    res.json({
      reports: reports.map(mapReport),
      total,
      offset,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports", async (req, res) => {
  try {
    const body = CreateReportBody.parse(req.body);
    const id = randomUUID();

    const [report] = await db
      .insert(vulnerabilityReportsTable)
      .values({
        id,
        chain: body.chain,
        contractAddress: body.contractAddress,
        txHash: body.txHash,
        severity: body.severity,
        kind: body.kind,
        description: body.description,
        functionSelector: body.functionSelector ?? null,
        flaggedSelectors: body.flaggedSelectors,
        stateDelta: body.stateDelta ?? null,
        forkValidated: body.forkValidated,
        confidenceScore: body.confidenceScore,
      })
      .returning();

    res.status(201).json(mapReport(report));
  } catch (err) {
    req.log.error({ err }, "Failed to create report");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/stats", async (req, res) => {
  try {
    const allReports = await db
      .select({
        severity: vulnerabilityReportsTable.severity,
        forkValidated: vulnerabilityReportsTable.forkValidated,
        timestamp: vulnerabilityReportsTable.timestamp,
      })
      .from(vulnerabilityReportsTable)
      .orderBy(desc(vulnerabilityReportsTable.timestamp));

    const stats = {
      total: allReports.length,
      critical: allReports.filter((r) => r.severity === "CRITICAL").length,
      high: allReports.filter((r) => r.severity === "HIGH").length,
      medium: allReports.filter((r) => r.severity === "MEDIUM").length,
      low: allReports.filter((r) => r.severity === "LOW").length,
      info: allReports.filter((r) => r.severity === "INFO").length,
      forkValidated: allReports.filter((r) => r.forkValidated).length,
      recentActivity: buildRecentActivity(allReports),
    };

    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Failed to get report stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/recent", async (req, res) => {
  try {
    const query = GetRecentReportsQueryParams.parse(req.query);

    const reports = await db
      .select()
      .from(vulnerabilityReportsTable)
      .where(query.chain ? eq(vulnerabilityReportsTable.chain, query.chain) : undefined)
      .orderBy(desc(vulnerabilityReportsTable.timestamp))
      .limit(query.limit);

    res.json(reports.map(mapReport));
  } catch (err) {
    req.log.error({ err }, "Failed to get recent reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/:id", async (req, res) => {
  try {
    const { id } = GetReportParams.parse(req.params);

    const [report] = await db
      .select()
      .from(vulnerabilityReportsTable)
      .where(eq(vulnerabilityReportsTable.id, id));

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    res.json(mapReport(report));
  } catch (err) {
    req.log.error({ err }, "Failed to get report");
    res.status(500).json({ error: "Internal server error" });
  }
});

type ReportRow = typeof vulnerabilityReportsTable.$inferSelect;

function mapReport(r: ReportRow) {
  return {
    id: r.id,
    chain: r.chain,
    contractAddress: r.contractAddress,
    txHash: r.txHash,
    severity: r.severity,
    kind: r.kind,
    description: r.description,
    functionSelector: r.functionSelector,
    flaggedSelectors: (r.flaggedSelectors as string[]) ?? [],
    stateDelta: r.stateDelta,
    timestamp: r.timestamp.toISOString(),
    forkValidated: r.forkValidated,
    confidenceScore: r.confidenceScore,
  };
}

function buildRecentActivity(
  reports: Array<{ timestamp: Date }>,
): Array<{ date: string; count: number }> {
  const now = new Date();
  const days = 7;
  const activityMap: Record<string, number> = {};

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    activityMap[key] = 0;
  }

  for (const r of reports) {
    const key = r.timestamp.toISOString().split("T")[0];
    if (key in activityMap) {
      activityMap[key]++;
    }
  }

  return Object.entries(activityMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default router;

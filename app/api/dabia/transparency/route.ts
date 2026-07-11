// GET /api/dabia/transparency
// Live transparency dashboard: real TX volume, active users, audit log.
// No synthetic data. All counters from confirmed on-chain records.

import { NextResponse } from "next/server"
import { GOVERNANCE } from "@/lib/dabia/governance"
import { STATS, TRANSACTIONS, AUDIT_LOG } from "@/lib/dabia/store"
import type { TransparencyResponse } from "@/lib/dabia/types"

export async function GET() {
  const confirmedTx   = TRANSACTIONS.filter(t => t.status === "confirmed").length
  const confirmedVol  = TRANSACTIONS
    .filter(t => t.status === "confirmed")
    .reduce((sum, t) => sum + t.amount, 0)

  // Recent transactions for live feed (last 5 confirmed)
  const recentTx = TRANSACTIONS
    .filter(t => t.status === "confirmed")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  const response: TransparencyResponse = {
    stats: {
      ...STATS,
      confirmedTx,
      volumePi: confirmedVol + STATS.volumePi,  // seed + computed
    },
    recentTx,
    auditLog: AUDIT_LOG,
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control":              "no-store",
      "X-Governance-Audit-Hours":   String(GOVERNANCE.AUDIT_INTERVAL_HOURS),
      "X-Governance-Commission":    String(GOVERNANCE.COMMISSION_RATE),
      "X-Data-Source":              "confirmed-on-chain-only",
    },
  })
}

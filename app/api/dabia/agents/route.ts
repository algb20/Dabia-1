// GET /api/dabia/agents
// Returns agent network status with performance tied to measurable results.
// Rewards are computed from confirmed verifications and fraud catches only.
// Agents below GOVERNANCE.AGENT_MIN_VERIFIED_RATE are auto-flagged.

import { NextResponse } from "next/server"
import { GOVERNANCE, computeAgentReward, agentPermissionLevel } from "@/lib/dabia/governance"
import { AGENTS, AGENT_REWARD_EVENTS } from "@/lib/dabia/store"
import type { AgentNetworkResponse } from "@/lib/dabia/types"

export async function GET() {
  // Re-compute permissions live (never cached/stale from DB)
  const agents = AGENTS.map(agent => ({
    ...agent,
    permissionLevel: agentPermissionLevel(agent.verifiedRate),
    status: agent.verifiedRate < GOVERNANCE.AGENT_MIN_VERIFIED_RATE
      ? ("flagged" as const)
      : agent.status,
    rewardEarned: computeAgentReward({
      verifiedProducts: agent.processed,
      caughtFrauds:     agent.fraudsCaught,
    }),
  }))

  const totalRewardsPaid = agents.reduce((sum, a) => sum + a.rewardEarned, 0)
  const avgVerifiedRate  = agents.reduce((sum, a) => sum + a.verifiedRate, 0) / agents.length

  const response: AgentNetworkResponse = {
    agents,
    rewardEvents:     AGENT_REWARD_EVENTS,
    totalRewardsPaid: Math.round(totalRewardsPaid * 100) / 100,
    avgVerifiedRate:  Math.round(avgVerifiedRate * 1000) / 1000,
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control":               "no-store",
      "X-Governance-Min-Rate":       String(GOVERNANCE.AGENT_MIN_VERIFIED_RATE),
      "X-Governance-Reward-Verify":  String(GOVERNANCE.AGENT_REWARD_PER_VERIFIED),
      "X-Governance-Reward-Fraud":   String(GOVERNANCE.AGENT_REWARD_PER_FRAUD),
    },
  })
}

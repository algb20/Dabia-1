// POST /api/dabia/security/challenge
// Multi-step verification for high-value transactions (>= GOVERNANCE.HIGH_VALUE_TX_THRESHOLD π)
// Stage 1: OTP initiation
// Stage 2: OTP verification
// Stage 3: Blockchain signature confirmation

import { NextRequest, NextResponse } from "next/server"
import { GOVERNANCE } from "@/lib/dabia/governance"
import type { SecurityChallenge } from "@/lib/dabia/types"

// In-memory challenge store (in production: Redis with TTL)
const challenges: Record<string, { otp: string; stage: 1 | 2 | 3; createdAt: number }> = {}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.txId || !body?.amount || !body?.userId) {
    return NextResponse.json({ error: "txId, amount, and userId required" }, { status: 400 })
  }

  // Only trigger multi-step for high-value transactions
  if (body.amount < GOVERNANCE.HIGH_VALUE_TX_THRESHOLD) {
    return NextResponse.json({
      required:  false,
      message:   `Transaction ${body.amount}π is below high-value threshold of ${GOVERNANCE.HIGH_VALUE_TX_THRESHOLD}π`,
    })
  }

  const stage: 1 | 2 | 3 = body.stage ?? 1

  if (stage === 1) {
    const otp = generateOTP()
    challenges[body.txId] = { otp, stage: 1, createdAt: Date.now() }
    // In production: send OTP via Pi Network messaging
    const challenge: SecurityChallenge = {
      txId:    body.txId, stage: 1, method: "otp",
      passed:  false, timestamp: new Date().toISOString(),
      requiredForAmount: GOVERNANCE.HIGH_VALUE_TX_THRESHOLD,
    }
    return NextResponse.json({ challenge, hint: `OTP sent to registered Pi account (demo: ${otp})` })
  }

  if (stage === 2) {
    const stored = challenges[body.txId]
    if (!stored || stored.stage !== 1) {
      return NextResponse.json({ error: "No active challenge for this transaction" }, { status: 409 })
    }
    if (Date.now() - stored.createdAt > 300000) {  // 5 minute expiry
      delete challenges[body.txId]
      return NextResponse.json({ error: "OTP expired. Restart verification." }, { status: 410 })
    }
    if (body.otp !== stored.otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 })
    }
    challenges[body.txId].stage = 2
    const challenge: SecurityChallenge = {
      txId: body.txId, stage: 2, method: "blockchain_sign",
      passed: false, timestamp: new Date().toISOString(),
      requiredForAmount: GOVERNANCE.HIGH_VALUE_TX_THRESHOLD,
    }
    return NextResponse.json({ challenge, message: "OTP verified. Awaiting blockchain signature." })
  }

  if (stage === 3) {
    const stored = challenges[body.txId]
    if (!stored || stored.stage !== 2) {
      return NextResponse.json({ error: "Stage 2 not completed" }, { status: 409 })
    }
    // Blockchain signature validation (in production: verify Pi Network signature)
    delete challenges[body.txId]
    const challenge: SecurityChallenge = {
      txId: body.txId, stage: 3, method: "blockchain_sign",
      passed: true, timestamp: new Date().toISOString(),
      requiredForAmount: GOVERNANCE.HIGH_VALUE_TX_THRESHOLD,
    }
    return NextResponse.json({ challenge, message: "Transaction fully verified. Proceeding to settlement." })
  }

  return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
}

import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { getFirebaseAdmin } from "@/lib/firebase/admin"

import type {
  DraftGeneratedPayload,
  FeatureUsagePayload,
  JudgementScorePayload,
  QualityVerdictPayload,
  RiskStripPayload,
  SendConfidencePayload,
  TeacherInteractionPayload,
  ZazaSignal,
  ZazaSignalPayload,
  ZazaSignalType,
} from "@/lib/analytics/signal-schema"

const USAGE_SIGNALS_COLLECTION = "usage_signals"
const MAX_SIGNALS_PER_MINUTE = 20
const SIGNAL_WINDOW_MS = 60_000
const MAX_TEXT_FIELD_LENGTH = 200

const signalRateLimitState = new Map<string, number[]>()

const SIGNAL_TYPES: ZazaSignalType[] = [
  "draft_generated",
  "draft_fallback_used",
  "draft_copy_edit_only",
  "draft_rewrite_triggered",
  "quality_verdict_emitted",
  "judgement_score_emitted",
  "low_confidence_fallback",
  "draft_accepted",
  "draft_edited_minor",
  "draft_edited_major",
  "draft_discarded",
  "draft_regenerated",
  "risk_strip_viewed",
  "risk_strip_ignored",
  "risk_strip_caused_pause",
  "risk_strip_caused_edit",
  "send_confidence_high_accepted",
  "send_confidence_medium_accepted",
  "send_confidence_low_accepted",
  "send_confidence_low_discarded",
  "teacher_draft_mode_used",
  "already_strong_path_used",
  "intent_classified",
  "register_correction_applied",
  "spelling_correction_applied",
]

function ok(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, ...payload }, { status })
}

function fail(status: number, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    { status },
  )
}

function hasOverlongTextField(value: unknown): boolean {
  if (typeof value === "string") {
    return value.length > MAX_TEXT_FIELD_LENGTH
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasOverlongTextField(item))
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((item) => hasOverlongTextField(item))
  }

  return false
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isLevel(value: unknown): value is "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high"
}

function isDraftGeneratedPayload(payload: unknown): payload is DraftGeneratedPayload {
  return (
    isObject(payload) &&
    typeof payload.modelUsed === "string" &&
    typeof payload.generationAttempts === "number" &&
    typeof payload.sourceWordCount === "number" &&
    typeof payload.outputWordCount === "number" &&
    typeof payload.inputIntent === "string" &&
    typeof payload.languagePair === "string" &&
    typeof payload.latencyMs === "number"
  )
}

function isQualityVerdictPayload(payload: unknown): payload is QualityVerdictPayload {
  return (
    isObject(payload) &&
    (payload.verdict === "already_strong" ||
      payload.verdict === "improved" ||
      payload.verdict === "needs_rewrite") &&
    Array.isArray(payload.violationCategories) &&
    payload.violationCategories.every((value) => typeof value === "string") &&
    typeof payload.violationCount === "number" &&
    typeof payload.blockingViolationCount === "number" &&
    typeof payload.advisoryViolationCount === "number"
  )
}

function isJudgementScorePayload(payload: unknown): payload is JudgementScorePayload {
  return (
    isObject(payload) &&
    typeof payload.sendConfidenceScore === "number" &&
    typeof payload.clarityScore === "number" &&
    typeof payload.authorityScore === "number" &&
    isLevel(payload.replyLikelihood) &&
    isLevel(payload.regretRisk) &&
    isLevel(payload.parentInterpretationRisk) &&
    typeof payload.boundaryStrengthScore === "number" &&
    typeof payload.sourceIntent === "string" &&
    (payload.parentEmotionalState === undefined || typeof payload.parentEmotionalState === "string")
  )
}

function isTeacherInteractionPayload(payload: unknown): payload is TeacherInteractionPayload {
  return (
    isObject(payload) &&
    ["accepted", "edited_minor", "edited_major", "discarded", "regenerated"].includes(
      String(payload.interactionType),
    ) &&
    typeof payload.timeToActionMs === "number" &&
    (payload.sendConfidenceScore === undefined || typeof payload.sendConfidenceScore === "number") &&
    (payload.verdictAtAction === undefined || typeof payload.verdictAtAction === "string") &&
    (payload.editDistanceCategory === undefined ||
      payload.editDistanceCategory === "none" ||
      payload.editDistanceCategory === "minor" ||
      payload.editDistanceCategory === "major")
  )
}

function isRiskStripPayload(payload: unknown): payload is RiskStripPayload {
  return (
    isObject(payload) &&
    ["viewed", "ignored", "caused_pause", "caused_edit"].includes(String(payload.interactionType)) &&
    typeof payload.sendConfidenceScore === "number" &&
    isLevel(payload.replyLikelihood) &&
    isLevel(payload.regretRisk) &&
    typeof payload.viewDurationMs === "number" &&
    (payload.subsequentAction === undefined ||
      ["sent", "edited", "discarded", "regenerated"].includes(String(payload.subsequentAction)))
  )
}

function isSendConfidencePayload(payload: unknown): payload is SendConfidencePayload {
  return (
    isObject(payload) &&
    typeof payload.scoreAtSend === "number" &&
    isLevel(payload.scoreBand) &&
    (payload.teacherAction === "sent" || payload.teacherAction === "discarded") &&
    isLevel(payload.replyLikelihood) &&
    isLevel(payload.regretRisk)
  )
}

function isFeatureUsagePayload(payload: unknown): payload is FeatureUsagePayload {
  return (
    isObject(payload) &&
    typeof payload.feature === "string" &&
    (payload.context === undefined || typeof payload.context === "string")
  )
}

function validateSignalPayload(signalType: ZazaSignalType, payload: unknown): payload is ZazaSignalPayload {
  switch (signalType) {
    case "draft_generated":
    case "draft_fallback_used":
    case "draft_copy_edit_only":
    case "draft_rewrite_triggered":
    case "low_confidence_fallback":
      return isDraftGeneratedPayload(payload)
    case "quality_verdict_emitted":
      return isQualityVerdictPayload(payload)
    case "judgement_score_emitted":
      return isJudgementScorePayload(payload)
    case "draft_accepted":
    case "draft_edited_minor":
    case "draft_edited_major":
    case "draft_discarded":
    case "draft_regenerated":
      return isTeacherInteractionPayload(payload)
    case "risk_strip_viewed":
    case "risk_strip_ignored":
    case "risk_strip_caused_pause":
    case "risk_strip_caused_edit":
      return isRiskStripPayload(payload)
    case "send_confidence_high_accepted":
    case "send_confidence_medium_accepted":
    case "send_confidence_low_accepted":
    case "send_confidence_low_discarded":
      return isSendConfidencePayload(payload)
    case "teacher_draft_mode_used":
    case "already_strong_path_used":
    case "intent_classified":
    case "register_correction_applied":
    case "spelling_correction_applied":
      return isFeatureUsagePayload(payload)
    default:
      return false
  }
}

function enforceRateLimit(uidHash: string, now: number) {
  const timestamps = signalRateLimitState.get(uidHash) ?? []
  const recentTimestamps = timestamps.filter((timestamp) => now - timestamp < SIGNAL_WINDOW_MS)

  if (recentTimestamps.length >= MAX_SIGNALS_PER_MINUTE) {
    signalRateLimitState.set(uidHash, recentTimestamps)
    return false
  }

  recentTimestamps.push(now)
  signalRateLimitState.set(uidHash, recentTimestamps)
  return true
}

export async function POST(request: Request) {
  let body: Partial<ZazaSignal> | null = null

  try {
    body = await request.json()
  } catch {
    return fail(400, "Payload must be valid JSON.")
  }

  if (!body || typeof body !== "object") {
    return fail(400, "Payload must be a JSON object.")
  }

  if (!body.uidHash || typeof body.uidHash !== "string") {
    return fail(400, "uidHash is required.")
  }

  if (!body.sessionId || typeof body.sessionId !== "string") {
    return fail(400, "sessionId is required.")
  }

  if (!body.signalType || !SIGNAL_TYPES.includes(body.signalType as ZazaSignalType)) {
    return fail(400, "signalType is invalid.")
  }

  if (!body.locale || typeof body.locale !== "string") {
    return fail(400, "locale is required.")
  }

  if (!body.appVersion || typeof body.appVersion !== "string") {
    return fail(400, "appVersion is required.")
  }

  if (body.schoolId !== undefined && typeof body.schoolId !== "string") {
    return fail(400, "schoolId must be a string when provided.")
  }

  if (!validateSignalPayload(body.signalType as ZazaSignalType, body.payload)) {
    return fail(400, "payload does not match the signal type.")
  }

  if (hasOverlongTextField(body.payload)) {
    return fail(400, "payload contains an overlong text field.")
  }

  const now = Date.now()
  if (!enforceRateLimit(body.uidHash, now)) {
    return fail(429, "rate limit exceeded.")
  }

  const { firestore } = getFirebaseAdmin()
  if (!firestore) {
    return fail(500, "Firestore is unavailable.")
  }

  const signalId = randomUUID()
  const signal: ZazaSignal = {
    signalId,
    sessionId: body.sessionId,
    uidHash: body.uidHash,
    schoolId: body.schoolId,
    timestamp: now,
    signalType: body.signalType as ZazaSignalType,
    payload: body.payload as ZazaSignalPayload,
    appVersion: body.appVersion,
    locale: body.locale,
  }

  try {
    await firestore.collection(USAGE_SIGNALS_COLLECTION).doc(signalId).set(signal)
  } catch (error) {
    console.error("[analytics] client signal write failed", error)
    return fail(500, "Unable to store signal.")
  }

  return ok({ stored: true })
}

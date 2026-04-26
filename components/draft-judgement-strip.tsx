"use client"

import { Reply, Shield, TriangleAlert } from "lucide-react"
import { useEffect, useRef } from "react"
import type { DraftMode } from "@/lib/types"
import type { ProfessionalJudgementSignal } from "@/lib/draft/professional-judgement"
import { useLocale } from "@/hooks/use-locale"
import { emitClientSignal } from "@/lib/analytics/client-signal-emitter"

type JudgementLevel = "low" | "medium" | "high"
export type DraftJudgementActionType = "sent" | "edited" | "discarded" | "regenerated"

export interface DraftJudgementActionEvent {
  type: DraftJudgementActionType
  at: number
}

export interface DraftProfessionalJudgementMeta {
  sendConfidenceScore: number
  replyLikelihood: JudgementLevel
  regretRisk: JudgementLevel
  parentInterpretationRisk: JudgementLevel
  signals: ProfessionalJudgementSignal[]
}

interface DraftJudgementStripProps {
  professionalJudgement: DraftProfessionalJudgementMeta | null
  teacherDraftMode: boolean
  modeUsed?: DraftMode
  verdict?: string | null
  loading?: boolean
  analyticsContext?: {
    sessionId: string
    uidHash: string
    locale: string
  } | null
  lastAction?: DraftJudgementActionEvent | null
}

function getToneClasses(tone: "success" | "warning" | "danger" | "muted") {
  switch (tone) {
    case "success":
      return {
        border: "border-green-200 dark:border-green-500/30",
        background: "bg-green-50 dark:bg-green-950/20",
        icon: "text-green-600 dark:text-green-400",
        value: "text-green-700 dark:text-green-300",
      }
    case "warning":
      return {
        border: "border-amber-200 dark:border-amber-500/30",
        background: "bg-amber-50 dark:bg-amber-950/20",
        icon: "text-amber-500 dark:text-amber-300",
        value: "text-amber-700 dark:text-amber-200",
      }
    case "danger":
      return {
        border: "border-red-200 dark:border-red-500/30",
        background: "bg-red-50 dark:bg-red-950/20",
        icon: "text-red-600 dark:text-red-400",
        value: "text-red-700 dark:text-red-300",
      }
    default:
      return {
        border: "border-slate-200 dark:border-slate-700",
        background: "bg-slate-50 dark:bg-slate-900/40",
        icon: "text-slate-400 dark:text-slate-500",
        value: "text-slate-500 dark:text-slate-300",
      }
  }
}

function getConfidenceTone(score: number) {
  if (score >= 80) {
    return "success" as const
  }
  if (score >= 60) {
    return "warning" as const
  }
  return "danger" as const
}

function getLevelTone(level: JudgementLevel) {
  if (level === "low") {
    return "success" as const
  }
  if (level === "medium") {
    return "warning" as const
  }
  return "danger" as const
}

function JudgementMetric(props: {
  label: string
  value: string
  tone: "success" | "warning" | "danger" | "muted"
  icon: typeof Shield
  testId: string
}) {
  const classes = getToneClasses(props.tone)
  const Icon = props.icon

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${classes.border} ${classes.background}`}
      data-testid={props.testId}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${classes.icon}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {props.label}
        </p>
        <p className={`truncate text-sm font-semibold ${classes.value}`}>{props.value}</p>
      </div>
    </div>
  )
}

export function DraftJudgementStrip({
  professionalJudgement,
  teacherDraftMode,
  modeUsed,
  verdict,
  loading = false,
  analyticsContext = null,
  lastAction = null,
}: DraftJudgementStripProps) {
  const { t } = useLocale()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const viewStartTimeRef = useRef<number | null>(null)
  const viewVisibleRef = useRef(false)
  const viewedEmittedRef = useRef(false)
  const ignoredEmittedRef = useRef(false)
  const pauseEmittedRef = useRef(false)
  const editEmittedRef = useRef(false)

  useEffect(() => {
    if (!analyticsContext || !rootRef.current || !professionalJudgement) {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) {
        viewVisibleRef.current = false
        viewStartTimeRef.current = null
        return
      }

      viewVisibleRef.current = true
      viewStartTimeRef.current = Date.now()

      window.setTimeout(() => {
        if (
          !viewedEmittedRef.current &&
          viewVisibleRef.current &&
          viewStartTimeRef.current &&
          Date.now() - viewStartTimeRef.current >= 2000
        ) {
          viewedEmittedRef.current = true
          void emitClientSignal({
            sessionId: analyticsContext.sessionId,
            uidHash: analyticsContext.uidHash,
            signalType: "risk_strip_viewed",
            payload: {
              interactionType: "viewed",
              sendConfidenceScore: professionalJudgement.sendConfidenceScore,
              replyLikelihood: professionalJudgement.replyLikelihood,
              regretRisk: professionalJudgement.regretRisk,
              viewDurationMs: Date.now() - viewStartTimeRef.current,
            },
            locale: analyticsContext.locale,
          })
        }
      }, 2000)
    }, { threshold: 0.5 })

    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [analyticsContext, professionalJudgement])

  useEffect(() => {
    if (!analyticsContext || !professionalJudgement || !lastAction || !viewStartTimeRef.current) {
      return
    }

    const viewDurationMs = Math.max(0, lastAction.at - viewStartTimeRef.current)
    const subsequentAction = lastAction.type

    if (lastAction.type === "edited" && !editEmittedRef.current) {
      editEmittedRef.current = true
      void emitClientSignal({
        sessionId: analyticsContext.sessionId,
        uidHash: analyticsContext.uidHash,
        signalType: "risk_strip_caused_edit",
        payload: {
          interactionType: "caused_edit",
          sendConfidenceScore: professionalJudgement.sendConfidenceScore,
          replyLikelihood: professionalJudgement.replyLikelihood,
          regretRisk: professionalJudgement.regretRisk,
          viewDurationMs,
          subsequentAction,
        },
        locale: analyticsContext.locale,
      })
      return
    }

    if (lastAction.type === "sent" && viewDurationMs <= 1000 && !ignoredEmittedRef.current) {
      ignoredEmittedRef.current = true
      void emitClientSignal({
        sessionId: analyticsContext.sessionId,
        uidHash: analyticsContext.uidHash,
        signalType: "risk_strip_ignored",
        payload: {
          interactionType: "ignored",
          sendConfidenceScore: professionalJudgement.sendConfidenceScore,
          replyLikelihood: professionalJudgement.replyLikelihood,
          regretRisk: professionalJudgement.regretRisk,
          viewDurationMs,
          subsequentAction,
        },
        locale: analyticsContext.locale,
      })
      return
    }

    if (viewDurationMs >= 5000 && !pauseEmittedRef.current) {
      pauseEmittedRef.current = true
      void emitClientSignal({
        sessionId: analyticsContext.sessionId,
        uidHash: analyticsContext.uidHash,
        signalType: "risk_strip_caused_pause",
        payload: {
          interactionType: "caused_pause",
          sendConfidenceScore: professionalJudgement.sendConfidenceScore,
          replyLikelihood: professionalJudgement.replyLikelihood,
          regretRisk: professionalJudgement.regretRisk,
          viewDurationMs,
          subsequentAction,
        },
        locale: analyticsContext.locale,
      })
    }
  }, [analyticsContext, lastAction, professionalJudgement])

  if (!teacherDraftMode || modeUsed !== "parent_message" || verdict === "already_strong") {
    return null
  }

  if (!professionalJudgement && !loading) {
    return null
  }

  if (loading || !professionalJudgement) {
    return (
      <div
        ref={rootRef}
        className="flex items-stretch gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/40"
        data-testid="draft-judgement-strip"
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/20"
          >
            <div className="h-4 w-4 flex-shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="h-2 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="flex items-stretch gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/40"
      data-testid="draft-judgement-strip"
    >
      <JudgementMetric
        label={t("judgementStrip.sendConfidence")}
        value={`${Math.round(professionalJudgement.sendConfidenceScore)}%`}
        tone={getConfidenceTone(professionalJudgement.sendConfidenceScore)}
        icon={Shield}
        testId="judgement-send-confidence"
      />
      <JudgementMetric
        label={t("judgementStrip.replyLikelihood")}
        value={t(`judgementStrip.${professionalJudgement.replyLikelihood}`)}
        tone={getLevelTone(professionalJudgement.replyLikelihood)}
        icon={Reply}
        testId="judgement-reply-likelihood"
      />
      <JudgementMetric
        label={t("judgementStrip.regretRisk")}
        value={t(`judgementStrip.${professionalJudgement.regretRisk}`)}
        tone={getLevelTone(professionalJudgement.regretRisk)}
        icon={TriangleAlert}
        testId="judgement-regret-risk"
      />
    </div>
  )
}

"use client"

import type { ProfessionalRiskFlag } from "@/src/lib/safetyEngine/professionalRiskDetector"

interface ProfessionalRiskBannerProps {
  flags?: ProfessionalRiskFlag[]
}

const FLAG_COPY: Record<
  ProfessionalRiskFlag["signalId"],
  { avoid: string; instead: string }
> = {
  pro_medical_speculation: {
    avoid: "Teachers should not speculate about diagnoses in parent messages.",
    instead: "I'd recommend speaking with our SENCO about a formal assessment.",
  },
  pro_motive_attribution: {
    avoid: "Asserting intent cannot be verified and may be challenged.",
    instead: "Describe the action only, not the intention behind it.",
  },
  pro_psychological_interpretation: {
    avoid: "Teachers should describe observable behaviour only.",
    instead: "Refer to observable behaviour and suggest pastoral support.",
  },
  pro_legal_certainty: {
    avoid: "Avoid stating certainty about serious incidents before formal investigation.",
    instead: "Use documentation channels for formal incident records.",
  },
}

function getFlagCopy(signalId: ProfessionalRiskFlag["signalId"]) {
  return FLAG_COPY[signalId] ?? {
    avoid: "Use observable, evidence-based language only.",
    instead: "Keep the wording factual and route concerns through the appropriate school process.",
  }
}

export function ProfessionalRiskBanner({ flags }: ProfessionalRiskBannerProps) {
  if (!flags || flags.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/10">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          ⚠ Professional Risk Detected
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-100/90">
          This message contains language that may expose you to a formal complaint.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {flags.map((flag) => {
          const copy = getFlagCopy(flag.signalId)

          return (
            <div
              key={`${flag.signalId}-${flag.matchedPhrase}`}
              className="rounded-lg border border-amber-200 bg-white/80 p-3 dark:border-amber-400/20 dark:bg-slate-950/40"
            >
              <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                <strong>{flag.label}</strong> — "{flag.matchedPhrase}"
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <strong>Avoid:</strong> {copy.avoid}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <strong>Instead:</strong> {copy.instead}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

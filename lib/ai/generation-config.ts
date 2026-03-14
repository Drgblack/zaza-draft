import type { DraftMode } from "@/lib/types"
import type { GenerationMetadata } from "@/lib/generation/classification"

const DEFAULT_GENERATION_SEED = 23

export type SamplingProfile =
  | "parent_message"
  | "report_comment"
  | "panic_scan"
  | "voice_to_calm"
  | "repair"

export interface GenerationConfigInput {
  mode: DraftMode
  generationMetadata: GenerationMetadata
  rewrite?: boolean
  hasRepairSignals?: boolean
}

export interface GenerationSamplingConfig {
  profile: SamplingProfile
  temperature: number
  top_p: number
  max_tokens: number
  seed?: number
}

function parseOptionalNumber(raw: string | undefined) {
  if (!raw) {
    return undefined
  }

  const trimmed = raw.trim().toLowerCase()
  if (!trimmed || trimmed === "off" || trimmed === "none") {
    return undefined
  }

  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

function resolveSeed() {
  const envValue = process.env.OPENAI_GENERATION_SEED
  const parsed = parseOptionalNumber(envValue)
  if (envValue && parsed === undefined) {
    return undefined
  }
  return parsed ?? DEFAULT_GENERATION_SEED
}

function withOverrides(config: GenerationSamplingConfig) {
  const temperatureOverride = parseOptionalNumber(process.env.OPENAI_GENERATION_TEMPERATURE)
  const topPOverride = parseOptionalNumber(process.env.OPENAI_GENERATION_TOP_P)

  return {
    ...config,
    temperature: temperatureOverride ?? config.temperature,
    top_p: topPOverride ?? config.top_p,
  }
}

export function resolveGenerationSamplingConfig(
  input: GenerationConfigInput,
): GenerationSamplingConfig {
  const baseConfig: GenerationSamplingConfig =
    input.mode === "report_comment"
      ? {
          profile: "report_comment",
          temperature: 0.1,
          top_p: 0.1,
          max_tokens: 320,
          seed: resolveSeed(),
        }
      : input.generationMetadata.mode === "panic_scan"
        ? {
            profile: "panic_scan",
            temperature: 0.12,
            top_p: 0.15,
            max_tokens: 420,
            seed: resolveSeed(),
          }
        : input.generationMetadata.mode === "voice_to_calm"
          ? {
              profile: "voice_to_calm",
              temperature: 0.16,
              top_p: 0.18,
              max_tokens: 460,
              seed: resolveSeed(),
            }
          : {
              profile: "parent_message",
              temperature: 0.18,
              top_p: 0.2,
              max_tokens: 500,
              seed: resolveSeed(),
            }

  const shouldUseRepairProfile = Boolean(input.rewrite || input.hasRepairSignals)
  if (!shouldUseRepairProfile) {
    return withOverrides(baseConfig)
  }

  return withOverrides({
    ...baseConfig,
    profile: "repair",
    temperature: Math.min(baseConfig.temperature, 0.1),
    top_p: Math.min(baseConfig.top_p, 0.12),
  })
}

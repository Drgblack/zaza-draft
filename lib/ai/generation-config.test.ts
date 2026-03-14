import { afterEach, describe, expect, it } from "vitest"

import { resolveGenerationSamplingConfig } from "./generation-config"

const DEFAULT_METADATA = {
  direction: "teacher_internal_notes" as const,
  source_type: "typed_text" as const,
  locale: "en" as const,
  prompt_builder: "safe_draft" as const,
}

afterEach(() => {
  delete process.env.OPENAI_GENERATION_SEED
  delete process.env.OPENAI_GENERATION_TEMPERATURE
  delete process.env.OPENAI_GENERATION_TOP_P
})

describe("resolveGenerationSamplingConfig", () => {
  it("uses stable low-variance defaults for parent messages", () => {
    const config = resolveGenerationSamplingConfig({
      mode: "parent_message",
      generationMetadata: {
        ...DEFAULT_METADATA,
        mode: "safe_draft",
      },
    })

    expect(config).toEqual({
      profile: "parent_message",
      temperature: 0.18,
      top_p: 0.2,
      max_tokens: 500,
      seed: 23,
    })
  })

  it("uses the tightest profile for report comments", () => {
    const config = resolveGenerationSamplingConfig({
      mode: "report_comment",
      generationMetadata: {
        ...DEFAULT_METADATA,
        mode: "safe_draft",
        direction: "report_comment",
      },
    })

    expect(config.profile).toBe("report_comment")
    expect(config.temperature).toBe(0.1)
    expect(config.top_p).toBe(0.1)
    expect(config.max_tokens).toBe(320)
  })

  it("uses dedicated profiles for panic scan and voice-to-calm", () => {
    const panicConfig = resolveGenerationSamplingConfig({
      mode: "parent_message",
      generationMetadata: {
        ...DEFAULT_METADATA,
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        prompt_builder: "panic_scan",
      },
    })
    const voiceConfig = resolveGenerationSamplingConfig({
      mode: "parent_message",
      generationMetadata: {
        ...DEFAULT_METADATA,
        mode: "voice_to_calm",
        source_type: "voice_transcript",
        prompt_builder: "voice_to_calm",
      },
    })

    expect(panicConfig.profile).toBe("panic_scan")
    expect(panicConfig.temperature).toBe(0.12)
    expect(panicConfig.top_p).toBe(0.15)
    expect(voiceConfig.profile).toBe("voice_to_calm")
    expect(voiceConfig.temperature).toBe(0.16)
    expect(voiceConfig.top_p).toBe(0.18)
  })

  it("drops into a repair profile for rewrites and quality retries", () => {
    const config = resolveGenerationSamplingConfig({
      mode: "parent_message",
      generationMetadata: {
        ...DEFAULT_METADATA,
        mode: "safe_draft",
      },
      rewrite: true,
      hasRepairSignals: true,
    })

    expect(config.profile).toBe("repair")
    expect(config.temperature).toBe(0.1)
    expect(config.top_p).toBe(0.12)
  })

  it("allows env overrides for future experiments", () => {
    process.env.OPENAI_GENERATION_TEMPERATURE = "0.14"
    process.env.OPENAI_GENERATION_TOP_P = "0.11"
    process.env.OPENAI_GENERATION_SEED = "101"

    const config = resolveGenerationSamplingConfig({
      mode: "parent_message",
      generationMetadata: {
        ...DEFAULT_METADATA,
        mode: "safe_draft",
      },
    })

    expect(config.temperature).toBe(0.14)
    expect(config.top_p).toBe(0.11)
    expect(config.seed).toBe(101)
  })
})

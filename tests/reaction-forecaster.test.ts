import { describe, expect, it } from "vitest"

import {
  forecastReactions,
  interpretReactionForecast,
  normalizeReactionForecast,
  REACTION_LADDER,
} from "@/src/lib/safetyEngine/reactionForecaster"

describe("forecastReactions", () => {
  it("makes defensive the highest reaction for accusation-heavy signals", () => {
    const forecast = forecastReactions(
      ["acc_your_child_negative", "acc_character_claim"],
      12,
    )

    expect(forecast.defensive).toBeGreaterThan(forecast.hostile)
    expect(forecast.defensive).toBeGreaterThan(forecast.collaborative)
    expect(forecast.defensive).toBeGreaterThan(forecast.concerned)
    expect(forecast.defensive).toBeGreaterThan(forecast.confused)
  })

  it("makes collaborative the highest reaction for collaborative mitigating signals", () => {
    const forecast = forecastReactions(
      ["mit_collaborative_opener", "mit_evidence_phrasing"],
      18,
    )

    expect(forecast.collaborative).toBeGreaterThan(forecast.concerned)
    expect(forecast.collaborative).toBeGreaterThan(forecast.defensive)
    expect(forecast.collaborative).toBeGreaterThan(forecast.confused)
    expect(forecast.hostile).toBe(0)
  })

  it("elevates confused when evidence phrasing is absent and word count exceeds 20", () => {
    const forecast = forecastReactions([], 24)

    expect(forecast.confused).toBeGreaterThan(forecast.collaborative)
    expect(forecast.confused).toBeGreaterThan(forecast.concerned)
    expect(forecast.confused).toBeGreaterThan(forecast.defensive)
    expect(forecast.confused).toBeGreaterThan(forecast.hostile)
  })

  it("suppresses low hostile percentages and redistributes them", () => {
    const forecast = forecastReactions(
      ["mit_collaborative_opener", "mit_positive_observation"],
      18,
    )

    expect(forecast.hostile).toBe(0)
    expect(
      forecast.collaborative +
        forecast.concerned +
        forecast.defensive +
        forecast.hostile +
        forecast.confused,
    ).toBe(100)
    expect(forecast.collaborative).toBeGreaterThan(40)
  })

  it("normalizes arbitrary forecast values so they round to exactly 100", () => {
    const normalized = normalizeReactionForecast({
      hostile: 10,
      defensive: 20,
      confused: 15,
      concerned: 20,
      collaborative: 20,
    })

    expect(
      normalized.hostile +
        normalized.defensive +
        normalized.confused +
        normalized.concerned +
        normalized.collaborative,
    ).toBe(100)
  })

  it("only uses the supported reaction ladder", () => {
    expect(REACTION_LADDER).toEqual([
      "hostile",
      "defensive",
      "confused",
      "concerned",
      "collaborative",
    ])
  })
})

describe("interpretReactionForecast", () => {
  it("returns a high escalation risk and empathetic recommendation when defensive is above 50%", () => {
    expect(
      interpretReactionForecast({
        hostile: 0,
        collaborative: 20,
        concerned: 0,
        confused: 25,
        defensive: 55,
      }),
    ).toEqual({
      escalationRisk: "HIGH",
      mostLikelyReaction: "Defensive",
      toneRecommendation: "Empathetic + collaborative",
    })
  })

  it("returns a medium escalation risk when defensive is above 30%", () => {
    expect(
      interpretReactionForecast({
        hostile: 0,
        collaborative: 28,
        concerned: 0,
        confused: 32,
        defensive: 40,
      }),
    ).toEqual({
      escalationRisk: "MEDIUM",
      mostLikelyReaction: "Defensive",
      toneRecommendation: "Professional + neutral",
    })
  })

  it("returns a low escalation risk and professional tone when defensive stays at 30% or below", () => {
    expect(
      interpretReactionForecast({
        hostile: 0,
        collaborative: 48,
        concerned: 0,
        confused: 24,
        defensive: 28,
      }),
    ).toEqual({
      escalationRisk: "LOW",
      mostLikelyReaction: "Collaborative",
      toneRecommendation: "Professional",
    })
  })

  it("can report concerned as the most likely parent reaction", () => {
    expect(
      interpretReactionForecast({
        hostile: 5,
        collaborative: 20,
        concerned: 45,
        confused: 15,
        defensive: 15,
      }),
    ).toEqual({
      escalationRisk: "LOW",
      mostLikelyReaction: "Concerned",
      toneRecommendation: "Professional",
    })
  })
})

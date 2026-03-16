import { describe, expect, it } from "vitest"

import {
  forecastReactions,
  interpretReactionForecast,
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
})

describe("interpretReactionForecast", () => {
  it("returns a high escalation risk and empathetic recommendation when defensive is above 50%", () => {
    expect(
      interpretReactionForecast({
        collaborative: 20,
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
        collaborative: 28,
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
        collaborative: 48,
        confused: 24,
        defensive: 28,
      }),
    ).toEqual({
      escalationRisk: "LOW",
      mostLikelyReaction: "Collaborative",
      toneRecommendation: "Professional",
    })
  })
})

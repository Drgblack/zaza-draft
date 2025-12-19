export interface DashboardMetrics {
  timeSaved: {
    hours: number
    trend: number
    trendDirection: "up" | "down"
  }
  draftsCreated: {
    total: number
    usedWithoutEdits: number
    percentage: number
  }
  currentStreak: {
    days: number
  }
  qualityScore: {
    score: number
    trend: number
  }
}

export interface TimeHeatmapData {
  day: string
  hour: number
  intensity: number
}

export interface ToneDistribution {
  tone: string
  percentage: number
  color: string
}

export interface ConfidenceData {
  week: string
  editRate: number
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  status: "earned" | "in-progress" | "locked"
  progress?: number
  total?: number
}

export interface WellbeingMetrics {
  afterHoursPercentage: number
  status: "good" | "warning" | "concern"
  lateNightDrafts: number
  workLifeScore: number
  weekendProtection: number
  eveningBoundaries: number
  consecutiveDays: number
}

export interface Recommendation {
  id: string
  type: "optimization" | "scheduling" | "feature"
  icon: string
  title: string
  description: string
  actionLabel: string
}

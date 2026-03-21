export type OnboardingRole =
  | "teacher"
  | "school_leader"
  | "senc_support"
  | "admin_staff"
  | "other"
  | null

export type OnboardingSchoolType =
  | "primary"
  | "secondary"
  | "all_through"
  | "international_private"
  | "other"
  | null

export type OnboardingMainUseCase =
  | "parent_messages"
  | "reports"
  | "both"
  | null

export type OnboardingWritingStressPoint =
  | "deescalation"
  | "clarity"
  | "tone"
  | "speed"
  | "difficult_conversations"
  | null

export type OnboardingTonePreference =
  | "warm"
  | "professional"
  | "direct"
  | "empathetic"
  | null

export type OnboardingRegion =
  | "germany_austria_switzerland"
  | "uk_ireland"
  | "usa_canada"
  | "australia_new_zealand"
  | "international_school"
  | "other_europe"
  | "latin_america"
  | "middle_east_africa"
  | "asia_pacific"
  | "other_prefer_not_to_say"
  | null

export type OnboardingProfile = {
  role: OnboardingRole
  schoolType: OnboardingSchoolType
  mainUseCase: OnboardingMainUseCase
  writingStressPoint: OnboardingWritingStressPoint
  tonePreference: OnboardingTonePreference
  region: OnboardingRegion
}

export type FirestoreOnboardingData = {
  role: OnboardingRole
  schoolType: OnboardingSchoolType
  region: OnboardingRegion
  tonePreference: OnboardingTonePreference
  useCase: OnboardingMainUseCase
  painPoints: Array<Exclude<OnboardingWritingStressPoint, null>>
  version: "v1"
}

export const EMPTY_ONBOARDING_PROFILE: OnboardingProfile = {
  role: null,
  schoolType: null,
  mainUseCase: null,
  writingStressPoint: null,
  tonePreference: null,
  region: null,
}

const ROLE_OPTIONS = new Set<Exclude<OnboardingRole, null>>([
  "teacher",
  "school_leader",
  "senc_support",
  "admin_staff",
  "other",
])

const SCHOOL_TYPE_OPTIONS = new Set<Exclude<OnboardingSchoolType, null>>([
  "primary",
  "secondary",
  "all_through",
  "international_private",
  "other",
])

const MAIN_USE_CASE_OPTIONS = new Set<Exclude<OnboardingMainUseCase, null>>([
  "parent_messages",
  "reports",
  "both",
])

const STRESS_POINT_OPTIONS = new Set<Exclude<OnboardingWritingStressPoint, null>>([
  "deescalation",
  "clarity",
  "tone",
  "speed",
  "difficult_conversations",
])

const TONE_PREFERENCE_OPTIONS = new Set<Exclude<OnboardingTonePreference, null>>([
  "warm",
  "professional",
  "direct",
  "empathetic",
])

const REGION_OPTIONS = new Set<Exclude<OnboardingRegion, null>>([
  "germany_austria_switzerland",
  "uk_ireland",
  "usa_canada",
  "australia_new_zealand",
  "international_school",
  "other_europe",
  "latin_america",
  "middle_east_africa",
  "asia_pacific",
  "other_prefer_not_to_say",
])

const LEGACY_REGION_ALIASES: Record<string, Exclude<OnboardingRegion, null>> = {
  germany: "germany_austria_switzerland",
  austria: "germany_austria_switzerland",
  switzerland: "germany_austria_switzerland",
  other: "other_prefer_not_to_say",
}

function normalizeOption<T extends string>(
  value: unknown,
  allowedOptions: Set<T>,
): T | null {
  if (typeof value !== "string") {
    return null
  }

  return allowedOptions.has(value as T) ? (value as T) : null
}

export function normalizeOnboardingProfile(input: unknown): OnboardingProfile {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ...EMPTY_ONBOARDING_PROFILE }
  }

  const record = input as Record<string, unknown>

  return {
    role: normalizeOption(record.role, ROLE_OPTIONS),
    schoolType: normalizeOption(record.schoolType, SCHOOL_TYPE_OPTIONS),
    mainUseCase: normalizeOption(record.mainUseCase, MAIN_USE_CASE_OPTIONS),
    writingStressPoint: normalizeOption(record.writingStressPoint, STRESS_POINT_OPTIONS),
    tonePreference: normalizeOption(record.tonePreference, TONE_PREFERENCE_OPTIONS),
    region:
      typeof record.region === "string" && LEGACY_REGION_ALIASES[record.region]
        ? LEGACY_REGION_ALIASES[record.region]
        : normalizeOption(record.region, REGION_OPTIONS),
  }
}

export function countAnsweredOnboardingFields(profile: OnboardingProfile) {
  return Object.values(profile).filter(Boolean).length
}

export function buildFirestoreOnboardingData(
  profile: OnboardingProfile,
): FirestoreOnboardingData {
  return {
    role: profile.role,
    schoolType: profile.schoolType,
    region: profile.region,
    tonePreference: profile.tonePreference,
    useCase: profile.mainUseCase,
    painPoints: profile.writingStressPoint ? [profile.writingStressPoint] : [],
    version: "v1",
  }
}

export function onboardingProfileFromFirestore(
  input: unknown,
): OnboardingProfile | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null
  }

  const record = input as Record<string, unknown>
  const normalizedPainPoint = Array.isArray(record.painPoints)
    ? record.painPoints.find((value): value is string => typeof value === "string") ?? null
    : null

  const profile = normalizeOnboardingProfile({
    role: record.role,
    schoolType: record.schoolType,
    region: record.region,
    tonePreference: record.tonePreference,
    mainUseCase: record.useCase,
    writingStressPoint: normalizedPainPoint,
  })

  return countAnsweredOnboardingFields(profile) > 0 ? profile : { ...EMPTY_ONBOARDING_PROFILE }
}

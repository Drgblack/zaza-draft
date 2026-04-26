export const ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID = "zaza-draft-app"
export const ZAZA_DRAFT_LEGACY_FIREBASE_PROJECT_ID = "zaza-id-and-licences"

export function getExplicitFirebaseProjectId() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  if (!projectId) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID. Server-side Firebase Admin usage must target an explicit project.",
    )
  }

  return projectId
}

export function isZazaDraftProductionProject(projectId: string) {
  return projectId === ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID
}

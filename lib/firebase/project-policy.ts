export const ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID = "zaza-draft-app"
export const ZAZA_DRAFT_LEGACY_FIREBASE_PROJECT_ID = "zaza-id-and-licences"

type AssertZazaDraftProjectOptions = {
  context: string
  mode?: "route" | "script"
  allowOverrideFlag?: boolean
  mutatesProtectedUserState?: boolean
  projectId?: string | null
}

export class FirebaseProjectSafetyError extends Error {
  code: "FIREBASE_PROJECT_MISMATCH"
  activeProjectId: string
  expectedProjectId: string
  context: string

  constructor(message: string, options: { activeProjectId: string; expectedProjectId: string; context: string }) {
    super(message)
    this.name = "FirebaseProjectSafetyError"
    this.code = "FIREBASE_PROJECT_MISMATCH"
    this.activeProjectId = options.activeProjectId
    this.expectedProjectId = options.expectedProjectId
    this.context = options.context
  }
}

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

export function assertZazaDraftProject(options: AssertZazaDraftProjectOptions) {
  const mode = options.mode ?? "route"
  const activeProjectId =
    options.projectId?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    "<unset>"

  if (isZazaDraftProductionProject(activeProjectId)) {
    return {
      projectId: activeProjectId,
      overrideApplied: false,
    }
  }

  const baseMessage =
    `[firebase-project] ${options.context} is configured for Firebase project ${activeProjectId}. ` +
    `Protected Zaza Draft app users, entitlements, roles, admin data, and user_profiles must use ${ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID}.`

  if (mode === "script" && options.allowOverrideFlag && options.mutatesProtectedUserState) {
    console.warn(
      `${baseMessage} Proceeding only because --allow-project-override was supplied for this script.`,
    )
    return {
      projectId: activeProjectId,
      overrideApplied: true,
    }
  }

  const suffix =
    mode === "script"
      ? "Re-run with --allow-project-override only if you intentionally need a non-production project."
      : "Server routes fail closed for protected app user/admin operations until FIREBASE_PROJECT_ID is aligned."

  throw new FirebaseProjectSafetyError(`${baseMessage} ${suffix}`, {
    activeProjectId,
    expectedProjectId: ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID,
    context: options.context,
  })
}

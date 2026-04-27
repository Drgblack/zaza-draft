import {
  assertZazaDraftProject,
  ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID,
} from "../lib/firebase/project-policy"

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

export function prepareFirebaseScriptEnvironment(options: {
  scriptName: string
  mutatesProtectedUserState?: boolean
}) {
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) {
    process.env.FIREBASE_PROJECT_ID = ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID
    console.info(
      `[firebase-project] FIREBASE_PROJECT_ID not set. Defaulting to ${ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID} for ${options.scriptName}.`,
    )
  }

  const projectId = process.env.FIREBASE_PROJECT_ID.trim()
  const allowProjectOverride = hasFlag("--allow-project-override")

  if (options.mutatesProtectedUserState) {
    assertZazaDraftProject({
      context: options.scriptName,
      mode: "script",
      allowOverrideFlag: allowProjectOverride,
      mutatesProtectedUserState: options.mutatesProtectedUserState,
      projectId,
    })
  }

  return {
    projectId,
    allowProjectOverride,
  }
}

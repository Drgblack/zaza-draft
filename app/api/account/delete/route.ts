import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { deleteUserData, hasDeleteConfirm } from "@/lib/account-data"
import type { Firestore } from "firebase-admin/firestore"

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Please send a JSON body with confirm: true.",
        },
      },
      { status: 400 },
    )
  }

  if (!hasDeleteConfirm(payload)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CONFIRMATION_REQUIRED",
          message: "Please confirm the deletion by sending { confirm: true }.",
        },
      },
      { status: 400 },
    )
  }

  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status: 401 },
    )
  }

  const firestore = (authContext as { firestore?: Firestore }).firestore
  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FIRESTORE_UNAVAILABLE",
          message: "Unable to access Firestore.",
        },
      },
      { status: 500 },
    )
  }

  await deleteUserData(firestore, authContext.uid)
  return NextResponse.json({ success: true })
}

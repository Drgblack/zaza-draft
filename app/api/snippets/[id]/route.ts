import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

export async function DELETE(request: Request, context: any) {
  const { params } = context as { params: { id: string } }
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status },
    )
  }

  const { uid, firestore } = authContext
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

  const snippetRef = firestore
    .collection("users")
    .doc(uid)
    .collection("snippets")
    .doc(params.id)

  try {
    const snapshot = await snippetRef.get()
    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Draft not found.",
          },
        },
        { status: 404 },
      )
    }

    await snippetRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[snippets] Failed to delete snippet", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SNIPPET_DELETE_FAILED",
          message: "Unable to delete draft right now.",
        },
      },
      { status: 500 },
    )
  }
}

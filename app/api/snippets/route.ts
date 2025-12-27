import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

const MAX_LIMIT = 20

export async function GET(request: Request) {
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

  const url = new URL(request.url)
  const limitParam = Number(url.searchParams.get("limit") ?? "5")
  const limit = Math.min(Math.max(limitParam || 5, 1), MAX_LIMIT)
  const cursor = url.searchParams.get("cursor") || undefined

  try {
    const collection = firestore.collection("users").doc(uid).collection("snippets")
    let query = collection.orderBy("createdAt", "desc").limit(limit)
    if (cursor) {
      query = query.startAfter(cursor)
    }

    const snapshot = await query.get()
    const snippets = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        generatedText: data.generatedText,
        tone: data.tone,
        language: data.language,
        wordCount: data.wordCount,
        contextUsed: data.contextUsed,
        pronounPreference: data.pronounPreference ?? "auto",
        pronounResolution: data.pronounResolution ?? null,
        createdAt: data.createdAt,
      }
    })

    const nextCursor = snippets.length === limit ? snippets[snippets.length - 1]?.createdAt : null

    return NextResponse.json({
      success: true,
      data: {
        snippets,
        nextCursor,
      },
    })
  } catch (error) {
    console.error("[snippets] Failed to fetch history", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SNIPPETS_FETCH_FAILED",
          message: "Unable to load recent drafts right now.",
        },
      },
      { status: 500 },
    )
  }
}

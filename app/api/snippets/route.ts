import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { DEFAULT_DRAFT_MODE } from "@/lib/draft-mode"

const MAX_LIMIT = 20
const MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|ï¿½|�)/g

function countEncodingArtifacts(value: string) {
  return value.match(MOJIBAKE_PATTERN)?.length ?? 0
}

function decodeLatin1AsUtf8(value: string) {
  const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff)
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes)
}

function sanitizeHistoryString(value: string) {
  const normalized = value.replace(/\u0000/g, "\uFFFD").replace(/ï¿½/g, "\uFFFD")
  const decoded = decodeLatin1AsUtf8(normalized)
  const decodedArtifactCount = countEncodingArtifacts(decoded)
  const normalizedArtifactCount = countEncodingArtifacts(normalized)

  if (decodedArtifactCount < normalizedArtifactCount) {
    return decoded.replace(/ï¿½/g, "\uFFFD")
  }

  return normalized
}

function sanitizeSnippetRecord<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeHistoryString(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSnippetRecord(item)) as T
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeSnippetRecord(entry),
      ]),
    ) as T
  }

  return value
}

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
      const data = sanitizeSnippetRecord(doc.data())
      return {
        id: doc.id,
        generatedText: data.generatedText,
        tone: data.tone,
        language: data.language,
        wordCount: data.wordCount,
        contextUsed: data.contextUsed,
        pronounPreference: data.pronounPreference ?? "auto",
        pronounResolution: data.pronounResolution ?? null,
        mode: data.mode ?? DEFAULT_DRAFT_MODE,
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

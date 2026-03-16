import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import {
  COMMENT_BANK_CATEGORIES,
  normalizeCommentBankCategories,
} from "@/lib/comment-bank"

const COMMENT_BANK_COLLECTION = "commentBankComments"
const MAX_LIMIT = 100
const MAX_COMMENT_LENGTH = 1200

function buildAuthErrorResponse(error: unknown) {
  const status = error instanceof FirebaseAuthorizationError ? error.statusCode : 401
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

export async function GET(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return buildAuthErrorResponse(error)
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
  const limitParam = Number(url.searchParams.get("limit") ?? "40")
  const limit = Math.min(Math.max(limitParam || 40, 1), MAX_LIMIT)

  try {
    const snapshot = await firestore
      .collection(COMMENT_BANK_COLLECTION)
      .where("userId", "==", uid)
      .where("libraryScope", "==", "personal")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const comments = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        commentId: data.commentId ?? doc.id,
        userId: data.userId ?? uid,
        schoolId: data.schoolId ?? null,
        commentText: typeof data.commentText === "string" ? data.commentText : "",
        categories: normalizeCommentBankCategories(data.categories),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt ?? data.createdAt,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        comments,
        schema: {
          collection: COMMENT_BANK_COLLECTION,
          fields: [
            "commentId",
            "userId",
            "schoolId",
            "commentText",
            "categories",
            "libraryScope",
            "createdAt",
            "updatedAt",
          ],
        },
      },
    })
  } catch (error) {
    console.error("[comment-bank] Failed to fetch comments", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_BANK_FETCH_FAILED",
          message: "Unable to load the comment bank right now.",
        },
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return buildAuthErrorResponse(error)
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

  const payload = await request.json().catch(() => null)
  const commentText =
    typeof payload?.commentText === "string" ? payload.commentText.trim() : ""
  const categories = normalizeCommentBankCategories(payload?.categories)

  if (!commentText) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_TEXT_REQUIRED",
          message: "Add a comment before saving it to the bank.",
        },
      },
      { status: 400 },
    )
  }

  if (commentText.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_TOO_LONG",
          message: "Comment bank entries must stay under 1,200 characters.",
        },
      },
      { status: 400 },
    )
  }

  if (!categories.length) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CATEGORY_REQUIRED",
          message: "Select at least one category before saving.",
        },
      },
      { status: 400 },
    )
  }

  const invalidCategory = categories.find(
    (category) => !(COMMENT_BANK_CATEGORIES as readonly string[]).includes(category),
  )
  if (invalidCategory) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_CATEGORY",
          message: "One or more categories are not supported.",
        },
      },
      { status: 400 },
    )
  }

  const commentId = randomUUID()
  const createdAt = new Date().toISOString()
  const record = {
    commentId,
    userId: uid,
    schoolId: null,
    libraryScope: "personal",
    commentText,
    categories,
    createdAt,
    updatedAt: createdAt,
  }

  try {
    await firestore.collection(COMMENT_BANK_COLLECTION).doc(commentId).set(record)

    return NextResponse.json({
      success: true,
      data: {
        comment: record,
      },
    })
  } catch (error) {
    console.error("[comment-bank] Failed to save comment", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_BANK_SAVE_FAILED",
          message: "Unable to save the comment right now.",
        },
      },
      { status: 500 },
    )
  }
}

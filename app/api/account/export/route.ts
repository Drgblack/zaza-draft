import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { collectUserExportData, createExportPayload } from "@/lib/account-data"
import type { Firestore } from "firebase-admin/firestore"

export async function GET(request: Request) {
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

  const exportData = await collectUserExportData(firestore, authContext.uid)
  const { body, headers } = createExportPayload(exportData)
  return new NextResponse(body, { headers })
}

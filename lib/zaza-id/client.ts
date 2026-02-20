import { parseDraftEntitlement, type DraftEntitlement } from "@/lib/zaza-id/types"

interface ZazaIdErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

export class ZazaIdClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public payload: ZazaIdErrorPayload | null = null,
  ) {
    super(message)
    this.name = "ZazaIdClientError"
  }
}

function getBaseUrl() {
  const baseUrl = process.env.ZAZA_ID_BASE_URL
  if (!baseUrl) {
    throw new Error("Missing ZAZA_ID_BASE_URL environment variable")
  }
  return baseUrl.replace(/\/+$/, "")
}

async function parseErrorPayload(response: Response): Promise<ZazaIdErrorPayload | null> {
  try {
    return (await response.json()) as ZazaIdErrorPayload
  } catch {
    return null
  }
}

export async function fetchDraftEntitlement(idToken: string): Promise<DraftEntitlement> {
  if (!idToken) {
    throw new Error("Missing Firebase ID token")
  }

  const endpoint = `${getBaseUrl()}/api/entitlements?productKey=draft`
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const payload = await parseErrorPayload(response)
    const message = payload?.error?.message || `Zaza ID request failed with status ${response.status}`
    throw new ZazaIdClientError(message, response.status, payload)
  }

  const payload = await response.json()
  return parseDraftEntitlement(payload)
}

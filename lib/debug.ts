export const DEBUG_QUERY_PARAM = "debug"

export function isDebugEnabled(searchParams?: URLSearchParams | null) {
  if (searchParams?.get(DEBUG_QUERY_PARAM) === "1") {
    return true
  }

  if (typeof window !== "undefined") {
    try {
      const windowParams = new URLSearchParams(window.location.search)
      if (windowParams.get(DEBUG_QUERY_PARAM) === "1") {
        return true
      }
    } catch {
      // ignore invalid URLs
    }
  }

  return process.env.NEXT_PUBLIC_DEBUG_UI === "1"
}

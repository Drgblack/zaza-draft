import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from "@/lib/auth/cookie"

const PROTECTED_PREFIXES = ["/insights", "/account", "/settings"]

export function shouldRequireAuth(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!shouldRequireAuth(pathname)) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)
  if (authCookie?.value === AUTH_COOKIE_VALUE) {
    return NextResponse.next()
  }

  const loginUrl = new URL("/", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/insights/:path*", "/account/:path*", "/settings/:path*"],
}

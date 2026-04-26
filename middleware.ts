import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  ADMIN_SESSION_COOKIE_NAME,
} from "@/lib/auth/admin-session"
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from "@/lib/auth/cookie"

const USER_PROTECTED_PREFIXES = ["/insights", "/account", "/settings"]

function isProtectedPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function shouldRequireAuth(pathname: string) {
  return USER_PROTECTED_PREFIXES.some((prefix) => isProtectedPrefix(pathname, prefix))
}

export function shouldRequireAdminSession(pathname: string) {
  if (pathname === "/admin/login") {
    return false
  }

  return isProtectedPrefix(pathname, "/admin")
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (shouldRequireAdminSession(pathname)) {
    const adminSessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)
    if (adminSessionCookie?.value) {
      return NextResponse.next()
    }

    const loginUrl = new URL("/admin/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

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
  matcher: ["/insights/:path*", "/account/:path*", "/settings/:path*", "/admin/:path*"],
}

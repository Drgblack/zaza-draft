"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

type AdminNavProps = {
  active: "analytics" | "licences" | "users"
  canManageUsers?: boolean
}

export function AdminNav({ active, canManageUsers = true }: AdminNavProps) {
  return (
    <nav className="flex items-center gap-3">
      <Link href="/admin/analytics">
        <Button variant={active === "analytics" ? "secondary" : "outline"}>Analytics</Button>
      </Link>
      <Link href="/admin/licences">
        <Button variant={active === "licences" ? "secondary" : "outline"}>Licences</Button>
      </Link>
      {canManageUsers ? (
        <Link href="/admin/users">
          <Button variant={active === "users" ? "secondary" : "outline"}>Users</Button>
        </Link>
      ) : null}
    </nav>
  )
}

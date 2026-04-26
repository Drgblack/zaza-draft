import { redirect } from "next/navigation"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const error = resolvedSearchParams.error

  if (typeof error === "string" && error.trim()) {
    redirect(`/?error=${encodeURIComponent(error)}`)
  }

  redirect("/")
}

import { AdminLicenceDetailPageClient } from "@/components/admin/admin-licence-detail-page"

export default async function AdminLicenceDetailPage({
  params,
}: {
  params: Promise<{ licenceId: string }>
}) {
  const { licenceId } = await params

  return <AdminLicenceDetailPageClient licenceId={licenceId} />
}

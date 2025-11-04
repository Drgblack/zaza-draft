import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import ClassDetail from "@/app/components/classes/ClassDetail";

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <main className="p-6">
        <ClassDetail id={params.id} />
      </main>
    </ProtectedRoute>
  );
}

import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { ClassList } from '@/app/components/classes/ClassList';

export default function ClassesPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  return (
    <ProtectedRoute>
      <main className="p-6">
        <ClassList ownerId={uid} />
      </main>
    </ProtectedRoute>
  );
}

"use client";
export const revalidate = 0;

export const dynamic = "force-dynamic";
;;

import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import ClassList from "@/app/components/classes/ClassList";

export default function ClassesPage() {
  return (
    <ProtectedRoute>
      <main className="p-6">
        <ClassList />
      </main>
    </ProtectedRoute>
  );
}









'use client';

import { useEffect, useState } from 'react';
import { addStudent, getStudentsForClass, deleteStudent, updateStudent, Student } from '@/lib/firestore/classBrain';
import { useAuth } from '@/lib/auth/hooks';
import { AddStudentForm } from './AddStudentForm';
import { EditStudentModal } from './EditStudentModal';
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

export function StudentsTable({ classId }: { classId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  async function handleUpdate(student: Student, patch: { name: string, email?: string }) {
    if (!user) {
      toast.error('Must be signed in');
      return;
    }

    const optimisticUpdate = {
      ...student,
      ...patch,
    };

    // Optimistically update UI
    setStudents(prev => prev.map(s => s.id === student.id ? optimisticUpdate : s));
    
    try {
      await updateStudent(classId, student.id!, patch);
      toast.success('Student updated');
    } catch (e) {
      console.error(e);
      // Rollback on error
      setStudents(prev => prev.map(s => s.id === student.id ? student : s));
      toast.error('Failed to update student');
    }
    setEditingStudent(null);
  }

  async function handleDelete(student: Student) {
    // Open confirm dialog
    setStudentToDelete(student);
  }

  async function handleDeleteConfirm() {
    const student = studentToDelete;
    setStudentToDelete(null);
    if (!student) return;
    if (!user) {
      toast.error('Must be signed in');
      return;
    }

    // Optimistically update UI
    setStudents(prev => prev.filter(s => s.id !== student.id));

    try {
      await deleteStudent(classId, student.id!);
      toast.success('Student deleted');
    } catch (e) {
      console.error(e);
      // Rollback on error
      setStudents(prev => [...prev, student]);
      toast.error('Failed to delete student');
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const s = await getStudentsForClass(classId);
        if (!mounted) return;
        setStudents(s ?? []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [classId]);

  async function handleAdd(name: string, email?: string) {
    if (!user) {
      toast.error('Must be signed in');
      return;
    }
    try {
      const student = await addStudent(classId, { name, email });
      setStudents(prev => [...prev, student]);
      toast.success('Student added');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add student');
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-14 bg-gray-100 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <AddStudentForm onAdd={handleAdd} />
      <ConfirmDialog
        open={!!studentToDelete}
        title="Delete student"
        description={`Are you sure you want to delete ${studentToDelete?.name ?? ''}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setStudentToDelete(null)}
      />

      <div className="mt-4">
        {editingStudent && (
          <EditStudentModal
            student={editingStudent}
            onSave={patch => handleUpdate(editingStudent, patch)}
            onCancel={() => setEditingStudent(null)}
          />
        )}

        {students.length === 0 ? (
          <div className="text-sm text-gray-600">No students yet.</div>
        ) : (
          <ul className="space-y-2">
            {students.map(s => (
              <li key={s.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{s.name}</div>
                  {s.email && <div className="text-sm text-gray-600">{s.email}</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingStudent(s)}
                    className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="px-2 py-1 text-sm border rounded text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

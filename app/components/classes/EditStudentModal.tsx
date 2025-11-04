"use client";
import { useEffect, useState } from 'react';
import { Student } from '@/lib/firestore/classBrain';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.union([z.string().email('Invalid email'), z.string().length(0), z.undefined()]),
}) satisfies z.ZodType<{ name: string; email?: string | undefined }>;

type StudentFormValues = z.infer<typeof studentSchema>;

interface EditStudentModalProps {
  student: Student;
  onSave: (values: StudentFormValues) => Promise<void>;
  onCancel: () => void;
}

export function EditStudentModal({ student, onSave, onCancel }: EditStudentModalProps) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: student.name,
      email: student.email || '',
    }
  });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(values: StudentFormValues) {
    setSubmitting(true);
    try {
      await onSave(values);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Escape key to close
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="edit-student-title">
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
        tabIndex={-1}
        aria-describedby="edit-student-desc"
        onKeyDown={e => {
          if (e.key === 'Tab') {
            // Focus trap: keep focus inside modal
            const focusable = Array.from(document.querySelectorAll('.edit-student-modal button, .edit-student-modal input'));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
        className="edit-student-modal"
      >
        <h2 id="edit-student-title" className="text-xl font-semibold mb-4">Edit Student</h2>
        <div id="edit-student-desc" className="sr-only">Edit the student's name and email. Press Escape to close.</div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label="Edit student form">
          <div>
            <label htmlFor="student-name" className="block text-sm font-medium text-gray-700">Name</label>
            <input {...form.register('name')} id="student-name" className="w-full p-2 border rounded" aria-required="true" />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600 mt-1" role="alert">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="student-email" className="block text-sm font-medium text-gray-700">Email (optional)</label>
            <input {...form.register('email')} id="student-email" className="w-full p-2 border rounded" aria-required="false" />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1" role="alert">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded" aria-label="Cancel edit">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded" aria-label="Save student">
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




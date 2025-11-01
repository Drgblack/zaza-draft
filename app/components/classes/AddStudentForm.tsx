'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.union([z.string().email('Invalid email'), z.string().length(0), z.undefined()]),
}) satisfies z.ZodType<{ name: string; email?: string | undefined }>;

type StudentFormValues = z.infer<typeof studentSchema>;

export function AddStudentForm({ onAdd }: { onAdd: (name: string, email?: string) => Promise<void> | void }) {
  const { register, handleSubmit, reset, formState } = useForm<StudentFormValues>({ resolver: zodResolver(studentSchema) });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(data: StudentFormValues) {
    setSubmitting(true);
    try {
      await onAdd(data.name, data.email as string | undefined);
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <div className="flex gap-2">
        <input {...register('name')} placeholder="Student name" className="flex-1 p-2 border rounded" />
        <input {...register('email')} placeholder="Email (optional)" className="w-64 p-2 border rounded" />
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
      {formState.errors.name && <div className="text-sm text-red-600">{formState.errors.name.message}</div>}
      {formState.errors.email && <div className="text-sm text-red-600">{formState.errors.email.message}</div>}
    </form>
  );
}

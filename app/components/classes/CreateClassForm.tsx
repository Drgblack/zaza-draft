'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClass } from '@/lib/firestore/classBrain';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().optional(),
  grade: z.string().optional(),
});
export type CreateClassFormData = z.infer<typeof schema>;

export function CreateClassForm({ ownerId, onCreated }: { ownerId: string; onCreated?: (id: string) => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateClassFormData>({
    resolver: zodResolver(schema),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: CreateClassFormData) => {
    setLoading(true);
    setError(null);
    try {
      const id = await createClass(ownerId, { name: data.name, subject: data.subject, grade: data.grade });
      reset();
      onCreated?.(id);
      // simple toast
      window.alert('Class created');
    } catch (e: any) {
      setError(e?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <input {...register('name')} placeholder="Class name" className="w-full rounded-md border p-2" />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <div className="flex gap-2">
        <input {...register('subject')} placeholder="Subject (optional)" className="flex-1 rounded-md border p-2" />
        <input {...register('grade')} placeholder="Grade (optional)" className="w-32 rounded-md border p-2" />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading} className="rounded-md bg-black text-white px-3 py-2">
        {loading ? 'Creating…' : 'Create class'}
      </button>
    </form>
  );
}

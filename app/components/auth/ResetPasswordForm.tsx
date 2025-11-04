"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';

const schema = z.object({ email: z.string().email('Please enter a valid email') });
export type ResetFormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await resetPassword(data.email);
      setMessage('If an account exists we sent instructions to that email.');
    } catch (e: any) {
      setError(e?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input {...register('email')} type="email" className="w-full rounded-md border p-2" />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>

      {message && <div className="rounded-md bg-green-50 p-3 text-green-700">{message}</div>}
      {error && <div className="rounded-md bg-red-50 p-3 text-red-700">{error}</div>}

      <button type="submit" disabled={isLoading} className="w-full rounded-md bg-black p-2 text-white">
        {isLoading ? 'Sendingâ€¦' : 'Send reset email'}
      </button>
    </form>
  );
}





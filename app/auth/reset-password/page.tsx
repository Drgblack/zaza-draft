"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { ResetPasswordForm } from '@/app/components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Reset password</h1>
          <p className="text-gray-600">Enter your email to receive reset instructions.</p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  );
}


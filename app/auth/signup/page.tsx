"use client";
export const revalidate = 0;

export const dynamic = "force-dynamic";
;;

import { SignUpForm } from '@/app/components/auth';

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="text-gray-600">Get started with Zaza Draft</p>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}









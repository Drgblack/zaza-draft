import { SignInForm } from '@/app/components/auth';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>
        <SignInForm />
      </div>
    </main>
  );
}
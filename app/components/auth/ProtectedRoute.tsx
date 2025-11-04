"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/hooks"; // you already use this elsewhere

type Props = { children: ReactNode };

export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth?.() ?? { user: null, loading: false };
  const router = useRouter();
  const pathname = usePathname();

  // While auth state is resolving, avoid flicker/redirect loops
  if (loading) {
    return (
      <main className="p-6">
        <p>Loading…</p>
      </main>
    );
  }

  // Not signed in → send to sign-in with return URL
  useEffect(() => {
    if (!loading && !user) {
      const ret = pathname ? `?returnTo=${encodeURIComponent(pathname)}` : "";
      router.replace(`/auth/signin${ret}`);
    }
  }, [loading, user, router, pathname]);

  if (!user) {
    // Render nothing (or a minimal placeholder) while redirecting
    return null;
  }

  return <>{children}</>;
}

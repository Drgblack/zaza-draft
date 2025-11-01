"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/app/components/ui/Spinner";

type ProtectedRouteProps = {
  children: ReactNode;
  redirectTo?: string;
};

export default function ProtectedRoute({
  children,
  redirectTo = "/auth/signin",
}: ProtectedRouteProps) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace(redirectTo as unknown as any);
  }, [status, user, router, redirectTo]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    // brief placeholder while redirect happens
    return <div className="p-8" />;
  }

  return <>{children}</>;
}
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/hooks";
import toast from "react-hot-toast";

type ClassRecord = {
  id: string;
  name?: string;
  description?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export default function ClassDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [item, setItem] = useState<ClassRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user || !id) return;
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/classes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { class: ClassRecord };
        if (alive) setItem(data.class ?? null);
      } catch {
        toast.error("Could not load class");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [user, id]);

  if (!user) return <div className="p-6">Please sign in.</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (!item) return <div className="p-6">Not found.</div>;

  return (
    <div className="p-6 space-y-2">
      <h2 className="text-xl font-semibold">{item.name ?? "Untitled class"}</h2>
      {item.description && <p className="text-muted-foreground">{item.description}</p>}
      {/* render the rest */}
    </div>
  );
}

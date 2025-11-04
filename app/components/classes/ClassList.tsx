"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/hooks";
import toast from "react-hot-toast";

type ClassRecord = {
  id: string;
  name?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export default function ClassList() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/classes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("classes fetch failed");
        const data = (await res.json()) as { classes: ClassRecord[] };
        if (alive) setItems(data.classes ?? []);
      } catch (e) {
        toast.error("Could not load classes");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return <div className="p-6">Please sign in.</div>;
  if (loading) return <div className="p-6">Loadingâ€¦</div>;

  if (!items.length) {
    return <div className="p-6 text-muted-foreground">No classes yet.</div>;
  }

  return (
    <ul className="p-6 space-y-2">
      {items.map((c) => (
        <li key={c.id} className="border rounded p-3">
          <div className="font-medium">{c.name ?? "Untitled class"}</div>
        </li>
      ))}
    </ul>
  );
}





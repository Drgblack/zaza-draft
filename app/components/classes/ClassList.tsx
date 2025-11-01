'use client';

import { useEffect, useState } from 'react';
import { getClassesForOwner } from '@/lib/firestore/classBrain';
import Link from 'next/link';
import { CreateClassForm } from './CreateClassForm';

export function ClassList({ ownerId }: { ownerId: string }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const list = await getClassesForOwner(ownerId);
      setClasses(list as any[]);
    } catch (e) {
      console.error(e);
      window.alert('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ownerId) load();
  }, [ownerId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Your classes</h2>
        <p className="text-sm text-gray-600">Create and manage class rosters.</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 border rounded-md">
          <CreateClassForm ownerId={ownerId} onCreated={(id) => {
            // optimistic: reload list
            load();
            // navigate? show toast
          }} />
        </div>

        {loading ? (
          <div>Loading…</div>
        ) : classes.length === 0 ? (
          <div>No classes yet.</div>
        ) : (
          <ul className="space-y-2">
            {classes.map((c) => (
              <li key={c.id} className="p-3 border rounded-md flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-600">{c.subject} · {c.grade}</div>
                </div>
                <div>
                  <Link href={`/classes/${c.id}`} className="text-sm text-blue-600 hover:underline">Open</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

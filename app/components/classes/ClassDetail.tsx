'use client';

import { useEffect, useState } from 'react';
import { getClass, normalizeClass, ClassMeta } from '@/lib/firestore/classBrain';
import { StudentsTable } from './StudentsTable';
import toast from 'react-hot-toast';

export function ClassDetail({ classId }: { classId: string }) {
  const [cls, setCls] = useState<ClassMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'students' | 'context'>('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const c = await getClass(classId);
        setCls(c ? normalizeClass(c) : null);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load class');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classId]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-1/3 bg-gray-100 rounded" />
          <div className="h-4 w-1/4 bg-gray-100 rounded" />
        </div>
        <div className="border-b">
          <nav className="flex gap-4">
            <div className="py-2 opacity-50">Overview</div>
            <div className="py-2 opacity-50">Students</div>
            <div className="py-2 opacity-50">Context</div>
          </nav>
        </div>
      </div>
    );
  }

  if (!cls) return <div>Class not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{cls.name}</h1>
          <div className="text-sm text-gray-600">
            {cls.subject ?? 'No subject'} · {cls.grade ?? 'No grade'}
          </div>
        </div>
      </div>

      <div className="border-b">
        <nav className="flex gap-4">
          <button 
            className={`py-2 ${tab === 'overview' ? 'border-b-2 border-black' : ''}`}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-2 ${tab === 'students' ? 'border-b-2 border-black' : ''}`}
            onClick={() => setTab('students')}
          >
            Students
          </button>
          <button
            className={`py-2 ${tab === 'context' ? 'border-b-2 border-black' : ''}`}
            onClick={() => setTab('context')}
          >
            Context
          </button>
        </nav>
      </div>

      <div>
        {tab === 'overview' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Created: {cls.createdAt?.toLocaleString?.() ?? 'Unknown'}
            </p>
          </div>
        )}
        {tab === 'students' && (
          <StudentsTable classId={classId} />
        )}
        {tab === 'context' && (
          <div>Context editor coming soon.</div>
        )}
      </div>
    </div>
  );
}

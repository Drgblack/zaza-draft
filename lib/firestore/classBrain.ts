import { db } from '@/lib/firebase/client';
import { dbAdmin } from '@/lib/firestore/server';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

// Types
export type UserProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  plan?: 'free' | 'pro';
  usage?: { snippetsThisMonth: number };
};

export type ClassMeta = {
  id?: string;
  ownerId: string;
  name: string;
  subject?: string;
  grade?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type Student = {
  id?: string;
  name: string;
  email?: string;
  notes?: string;
};

export type ContextDoc = {
  id?: string;
  goals?: string[];
  constraints?: string[];
  rubricRefs?: string[];
};

export type Snippet = {
  id?: string;
  ownerId: string;
  classId?: string;
  inputs: any;
  output: any;
  tokens?: number;
  createdAt?: any;
};

// Client helpers (use in client code)
export async function createClass(clientOwnerId: string, payload: Omit<ClassMeta, 'ownerId' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'classes'), {
    ownerId: clientOwnerId,
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addStudent(classId: string, student: Student) {
  const ref = await addDoc(collection(db, `classes/${classId}/students`), {
    ...student,
    createdAt: serverTimestamp(),
  });
  // Return a simple Student object including the generated id so callers can update UI optimistically
  return { id: ref.id, ...student } as Student;
}

export async function createSnippet(snippet: Snippet) {
  const ref = await addDoc(collection(db, 'snippets'), {
    ...snippet,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getClass(classId: string) {
  const d = await getDoc(doc(db, 'classes', classId));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as ClassMeta;
}

// Server-side admin helpers (use in API routes)
export async function adminCreateClass(ownerId: string, payload: Omit<ClassMeta, 'ownerId' | 'createdAt' | 'updatedAt'>) {
  const ref = await dbAdmin.collection('classes').add({
    ownerId,
    ...payload,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function adminGetClass(classId: string) {
  const d = await dbAdmin.collection('classes').doc(classId).get();
  if (!d.exists) return null;
  return { id: d.id, ...d.data() } as ClassMeta;
}

export async function adminAddStudent(classId: string, student: Student) {
  const ref = await dbAdmin.collection(`classes/${classId}/students`).add({
    ...student,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function adminCreateSnippet(snippet: Snippet) {
  const ref = await dbAdmin.collection('snippets').add({
    ...snippet,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

// Simple query: get classes for owner
export async function getClassesForOwner(ownerId: string) {
  const q = query(collection(db, 'classes'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Get students for a class (client-side)
export async function getStudentsForClass(classId: string) {
  const snap = await getDocs(collection(db, `classes/${classId}/students`));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
}

// Update student in a class
export async function updateStudent(classId: string, studentId: string, patch: Partial<Student>) {
  // Exclude id from the update data since it's a document property
  const { id, ...updateData } = patch;
  await updateDoc(doc(db, `classes/${classId}/students`, studentId), {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
  return studentId;
}

// Delete student from a class
export async function deleteStudent(classId: string, studentId: string) {
  await deleteDoc(doc(db, `classes/${classId}/students`, studentId));
  return studentId;
}

// Expose a small converter (client-side) to normalize timestamps
export function normalizeClass(docData: any): ClassMeta {
  return {
    id: docData.id,
    ownerId: docData.ownerId,
    name: docData.name,
    subject: docData.subject,
    grade: docData.grade,
    createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : docData.createdAt,
    updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate() : docData.updatedAt,
  };
}


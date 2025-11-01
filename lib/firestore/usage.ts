import { db } from '@/lib/firebase/client';
import { dbAdmin } from '@/lib/firebase/admin';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase/client';
import { UserProfile } from './classBrain';

const FREE_SNIPPETS_PER_MONTH = 10;

export async function getUserProfile(uid: string) {
  const d = await getDoc(doc(db, 'users', uid));
  if (!d.exists()) {
    // Create default profile
    const profile: UserProfile = {
      uid,
      plan: 'free',
      email: auth.currentUser?.email,
      displayName: auth.currentUser?.displayName,
      usage: { snippetsThisMonth: 0 },
    };
    await updateDoc(doc(db, 'users', uid), profile);
    return profile;
  }
  return d.data() as UserProfile;
}

export async function incrementSnippetUsage(uid: string) {
  const profile = await getUserProfile(uid);
  
  if (profile.plan === 'free' && (profile.usage?.snippetsThisMonth ?? 0) >= FREE_SNIPPETS_PER_MONTH) {
    throw new Error('Free plan limit reached');
  }

  await updateDoc(doc(db, 'users', uid), {
    'usage.snippetsThisMonth': increment(1),
    updatedAt: serverTimestamp(),
  });

  return { newCount: (profile.usage?.snippetsThisMonth ?? 0) + 1 };
}

// Admin helper to reset monthly usage (could be called by a Cloud Function)
export async function adminResetMonthlyUsage(uid: string) {
  await dbAdmin.doc(`users/${uid}`).update({
    'usage.snippetsThisMonth': 0,
    updatedAt: serverTimestamp(),
  });
}

// Check if user can generate more snippets
export async function canGenerateSnippet(uid: string) {
  const profile = await getUserProfile(uid);
  if (profile.plan === 'pro') return true;
  return (profile.usage?.snippetsThisMonth ?? 0) < FREE_SNIPPETS_PER_MONTH;
}
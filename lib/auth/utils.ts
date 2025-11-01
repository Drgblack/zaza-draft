import { auth } from '../firebase/client';

export async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
}

export function getAuthToken() {
  return auth.currentUser?.getIdToken();
}

export function getUserId() {
  return auth.currentUser?.uid;
}

export function getUserEmail() {
  return auth.currentUser?.email;
}
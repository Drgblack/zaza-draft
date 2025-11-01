import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

function redact(obj: any) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy: any = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = k.toLowerCase();
    if (key.includes('email') || key.includes('token') || key.includes('password') || key.includes('secret')) {
      copy[k] = typeof v === 'string' ? v.replace(/(.{2}).+(.{2})/, '$1…$2') : 'REDACTED';
    } else if (typeof v === 'object') {
      copy[k] = redact(v);
    } else {
      copy[k] = v;
    }
  }
  return copy;
}

export function logInfo({ uid, route, payloadSize, message }: { uid?: string; route?: string; payloadSize?: number; message: string }) {
  // Minimal, non-sensitive info
  // eslint-disable-next-line no-console
  console.info(`[INFO] uid=${uid ?? 'anon'} route=${route ?? 'n/a'} size=${payloadSize ?? 0} - ${message}`);
}

export function logWarn({ uid, route, payloadSize, message }: { uid?: string; route?: string; payloadSize?: number; message: string }) {
  // eslint-disable-next-line no-console
  console.warn(`[WARN] uid=${uid ?? 'anon'} route=${route ?? 'n/a'} size=${payloadSize ?? 0} - ${message}`);
}

export function logError({ uid, route, payloadSize, message, code }: { uid?: string; route?: string; payloadSize?: number; message: string; code?: string }) {
  // In production avoid stack traces in logs; keep message and error code
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] uid=${uid ?? 'anon'} route=${route ?? 'n/a'} code=${code ?? 'N/A'} size=${payloadSize ?? 0} - ${message}`);
  } else {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] uid=${uid ?? 'anon'} route=${route ?? 'n/a'} code=${code ?? 'N/A'} size=${payloadSize ?? 0} - ${message}`);
  }
}

export async function writeAudit({ event, uid, route, payloadSize, details }: { event: string; uid?: string; route?: string; payloadSize?: number; details?: any }) {
  try {
    const safeDetails = redact(details);
    await addDoc(collection(db, 'audit'), {
      event,
      uid: uid ?? 'anon',
      route: route ?? 'n/a',
      payloadSize: payloadSize ?? 0,
      details: safeDetails,
      timestamp: new Date(),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to write audit log', process.env.NODE_ENV === 'production' ? (e as Error).message : e);
  }
}

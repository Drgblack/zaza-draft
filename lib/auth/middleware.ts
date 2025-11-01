import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { dbAdmin } from '@/lib/firebase/admin';

export async function authMiddleware(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decodedToken = await dbAdmin.verifyIdToken(token);
    const user = await dbAdmin.getUser(decodedToken.uid);

    // Attach user to request for route handlers
    req.headers.set('X-User-Id', user.uid);
    req.headers.set('X-User-Email', user.email || '');

    return NextResponse.next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

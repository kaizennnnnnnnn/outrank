import { NextRequest } from 'next/server';
import { adminAuth } from './firebaseAdmin';

/**
 * Pulls the Firebase ID token from the Authorization header and verifies
 * it server-side. Used by every /api/orb/* route. Throws on failure.
 *
 * Client passes `Authorization: Bearer <token>` where the token comes
 * from `auth.currentUser.getIdToken()`.
 */
export async function verifyOrbRequest(req: NextRequest): Promise<{ uid: string }> {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw new Error('missing-token');
  }
  const token = header.slice(7).trim();
  if (!token) throw new Error('missing-token');
  const decoded = await adminAuth.verifyIdToken(token);
  return { uid: decoded.uid };
}

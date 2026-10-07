import 'server-only';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/**
 * リクエストの Firebase ID トークンを検証し、admins/{uid} が存在する場合のみ管理者とみなす。
 * admins の確認は利用者本人のトークンで Firestore REST API を呼ぶため、
 * サービスアカウント鍵をサーバーに置く必要がない（セキュリティルールで本人のみ読める）。
 */
export async function verifyAdmin(req: Request): Promise<{ uid: string } | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!projectId || !token) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const uid = payload.sub;
    if (!uid) return null;

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    );
    return res.ok ? { uid } : null;
  } catch {
    return null;
  }
}

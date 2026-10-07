import 'server-only';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/** Cloudflare R2（S3 互換 API）。キーはサーバー側の環境変数だけで管理する */
const accountId = (process.env.R2_ACCOUNT_ID ?? '').trim();
const bucket = (process.env.R2_BUCKET ?? '').trim();
const publicBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');

export const isR2Configured = Boolean(
  accountId && bucket && publicBase && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY,
);

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      // R2 は新しい AWS SDK の既定チェックサムに対応していない場合があるため、必要時のみに限定
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }
  return client;
}

/** coins/ 配下の、想定した形式のキーだけを扱う */
export function isCoinKey(key: unknown): key is string {
  return typeof key === 'string' && /^coins\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_.-]{1,100}$/.test(key);
}

export function publicUrl(key: string): string {
  return `${publicBase}/${key}`;
}

export async function putImage(key: string, body: Uint8Array, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // キーは毎回ユニークなので長期キャッシュしてよい
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

export async function deleteImage(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getImage(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return { bytes, contentType: res.ContentType ?? 'image/jpeg' };
  } catch {
    return null;
  }
}

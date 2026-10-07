import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { deleteImage, isCoinKey, isR2Configured, publicUrl, putImage } from '@/lib/server/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ブラウザ側で縮小済みの画像を受け取る上限（Netlify の受信上限 6MB 未満） */
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function err(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** 画像アップロード（管理者のみ） */
export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return err('管理者としてログインしてください。', 401);
  if (!isR2Configured) return err('画像保存先（R2）の設定が未登録です。', 500);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err('リクエストが不正です。', 400);
  }
  const coinId = String(form.get('coinId') ?? '');
  const file = form.get('file');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(coinId)) return err('商品 ID が不正です。', 400);
  if (!(file instanceof Blob)) return err('画像がありません。', 400);
  const ext = TYPES[file.type];
  if (!ext) return err('JPG・PNG・WebP の画像を選択してください。', 400);
  if (file.size > MAX_BYTES) return err('画像の容量が大きすぎます。', 400);

  const key = `coins/${coinId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  try {
    await putImage(key, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (e) {
    console.error('R2 upload failed', e);
    return err('画像を保存できませんでした。', 502);
  }
  return Response.json({ path: key, url: publicUrl(key) });
}

/** 画像削除（管理者のみ） */
export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return err('管理者としてログインしてください。', 401);
  if (!isR2Configured) return err('画像保存先（R2）の設定が未登録です。', 500);

  let body: { path?: unknown };
  try {
    body = await req.json();
  } catch {
    return err('リクエストが不正です。', 400);
  }
  if (!isCoinKey(body.path)) return err('画像の指定が不正です。', 400);
  try {
    await deleteImage(body.path);
  } catch (e) {
    console.error('R2 delete failed', e);
    return err('画像を削除できませんでした。', 502);
  }
  return Response.json({ ok: true });
}

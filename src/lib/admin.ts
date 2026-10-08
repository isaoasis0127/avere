'use client';

import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { toCoin } from './coins';
import type { AiDraft, Coin, CoinFields, CoinImage, CoinIntro, Inquiry, InquiryStatus } from './types';

// ---------- 権限 ----------

/** admins/{uid} ドキュメントが存在するユーザーだけが管理者 */
export async function checkIsAdmin(uid: string): Promise<boolean> {
  try {
    const d = await getDoc(doc(db(), 'admins', uid));
    return d.exists();
  } catch {
    return false;
  }
}

// ---------- コイン ----------

export async function listAllCoins(): Promise<Coin[]> {
  const snap = await getDocs(collection(db(), 'coins'));
  return snap.docs.map((d) => toCoin(d.id, d.data())).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCoin(id: string): Promise<Coin | null> {
  const d = await getDoc(doc(db(), 'coins', id));
  return d.exists() ? toCoin(d.id, d.data()) : null;
}

export function newCoinId(): string {
  return doc(collection(db(), 'coins')).id;
}

export async function createCoin(id: string, fields: CoinFields) {
  await setDoc(doc(db(), 'coins', id), {
    ...fields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCoin(id: string, fields: Partial<CoinFields>) {
  await updateDoc(doc(db(), 'coins', id), { ...fields, updatedAt: serverTimestamp() });
}

export async function setCoinPublished(id: string, published: boolean) {
  await updateCoin(id, { published });
}

export async function deleteCoin(coin: Coin) {
  await deleteDoc(doc(db(), 'coins', coin.id));
  await deleteDoc(doc(db(), 'coinPrivate', coin.id)).catch(() => undefined);
  await Promise.all(coin.images.map((i) => removeImage(i.path)));
}

// ---------- 管理者専用メモ（要確認事項） ----------

export async function getReviewNotes(id: string): Promise<string> {
  const d = await getDoc(doc(db(), 'coinPrivate', id));
  return d.exists() ? String(d.data().reviewNotes ?? '') : '';
}

export async function saveReviewNotes(id: string, reviewNotes: string) {
  await setDoc(doc(db(), 'coinPrivate', id), { reviewNotes, updatedAt: serverTimestamp() });
}

// ---------- 画像 ----------

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 2000;

/**
 * ブラウザで長辺 2000px の JPEG に縮小してからアップロードする。
 * 表示が速くなり、AI に送る画像の容量制限にも収まる。
 */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const toJpeg = (q: number) =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像を変換できませんでした'))), 'image/jpeg', q),
    );
  // サーバーの受信上限（4MB）に収まるまで画質を下げる
  for (const q of [0.88, 0.8, 0.7]) {
    const blob = await toJpeg(q);
    if (blob.size <= 3.5 * 1024 * 1024) return blob;
  }
  return toJpeg(0.6);
}

/** ログイン中の管理者の ID トークン（サーバー API の認証に使う） */
async function idToken(): Promise<string> {
  const user = auth().currentUser;
  if (!user) throw new Error('ログインの有効期限が切れました。再度ログインしてください。');
  return user.getIdToken();
}

/** 縮小した画像をサーバー経由で Cloudflare R2 に保存する */
export async function uploadCoinImage(coinId: string, file: File): Promise<CoinImage> {
  const blob = await shrinkImage(file);
  const form = new FormData();
  form.append('coinId', coinId);
  form.append('file', blob, 'image.jpg');
  const res = await fetch('/api/admin/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await idToken()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.path) throw new Error(data.error || '画像をアップロードできませんでした。');
  return { path: data.path, url: data.url };
}

export async function removeImage(path: string) {
  if (!path) return;
  try {
    await fetch('/api/admin/images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await idToken()}` },
      body: JSON.stringify({ path }),
    });
  } catch {
    // すでに存在しない場合などは無視
  }
}

// ---------- AI 紹介文 ----------

export type AiInput = {
  name: string;
  country: string;
  year: string;
  denomination: string;
  material: string;
  gradingCompany: string;
  grade: string;
  /** R2 上の画像キー（最大4枚） */
  imagePaths: string[];
};

/** サーバー側の /api/ai/describe を呼ぶ（ログイン中の管理者の ID トークンで認証） */
export async function generateIntro(input: AiInput): Promise<AiDraft> {
  const token = await idToken();
  const res = await fetch('/api/ai/describe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  // 長時間の処理に備えてストリーミングで返す（NDJSON の最終行が結果）
  const lines = text.split('\n').filter((l) => l.trim());
  let last: { type?: string; data?: AiDraft; message?: string } = {};
  try {
    last = JSON.parse(lines[lines.length - 1] ?? '{}');
  } catch {
    // 下でエラー扱い
  }
  if (last.type === 'result' && last.data) return last.data;
  if (last.type === 'progress')
    throw new Error('AI の応答が途中で途切れました（処理時間の上限）。もう一度お試しください。');
  throw new Error(last.message || `AI 生成に失敗しました（${res.status}）。`);
}

export function introIsEmpty(i: CoinIntro): boolean {
  return !i.overview.trim() && !i.history.trim() && !i.design.trim() && !i.appeal.trim();
}

// ---------- 問い合わせ ----------

function millis(v: unknown): number {
  const t = v as { toMillis?: () => number } | null;
  return t && typeof t.toMillis === 'function' ? t.toMillis() : 0;
}

export async function listInquiries(): Promise<Inquiry[]> {
  const snap = await getDocs(query(collection(db(), 'inquiries'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      coinId: x.coinId ?? '',
      coinName: x.coinName ?? '',
      coinPrice: Number(x.coinPrice ?? 0),
      name: x.name ?? '',
      email: x.email ?? '',
      message: x.message ?? '',
      status: (x.status ?? '未対応') as InquiryStatus,
      createdAt: millis(x.createdAt),
    };
  });
}

export async function setInquiryStatus(id: string, status: InquiryStatus) {
  await updateDoc(doc(db(), 'inquiries', id), { status });
}

export async function countOpenInquiries(): Promise<number> {
  try {
    const snap = await getCountFromServer(query(collection(db(), 'inquiries'), where('status', '==', '未対応')));
    return snap.data().count;
  } catch {
    return 0;
  }
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { EMPTY_INTRO, type Coin, type CoinImage } from './types';

function millis(v: unknown): number {
  if (v && typeof v === 'object' && 'toMillis' in v && typeof (v as { toMillis: unknown }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  return typeof v === 'number' ? v : 0;
}

export function toCoin(id: string, x: DocumentData): Coin {
  const images: CoinImage[] = Array.isArray(x.images)
    ? x.images
        .filter((i: unknown) => i && typeof (i as CoinImage).url === 'string')
        .map((i: CoinImage) => ({ url: i.url, path: i.path ?? '' }))
    : [];
  const intro = x.intro && typeof x.intro === 'object' ? x.intro : {};
  return {
    id,
    name: x.name ?? '',
    price: Number(x.price ?? 0),
    country: x.country ?? '',
    year: x.year ?? '',
    denomination: x.denomination ?? '',
    material: x.material ?? '',
    gradingCompany: x.gradingCompany ?? '',
    grade: x.grade ?? '',
    images,
    intro: { ...EMPTY_INTRO, ...intro },
    isSample: x.isSample === true,
    published: x.published === true,
    createdAt: millis(x.createdAt),
    updatedAt: millis(x.updatedAt),
  };
}

/** 一覧カード用の代表画像（先頭の画像） */
export function coverImage(c: Coin): string {
  return c.images[0]?.url ?? '';
}

export type SortKey = 'new' | 'price_desc' | 'price_asc';

export function sortCoins(coins: Coin[], sort: SortKey): Coin[] {
  const list = [...coins];
  if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
  else list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
}

/** 公開中のコイン（公開サイト用・未ログインで読める範囲のみ） */
export async function getPublishedCoins(): Promise<Coin[]> {
  if (!isFirebaseConfigured) return [];
  try {
    const snap = await getDocs(query(collection(db(), 'coins'), where('published', '==', true)));
    return snap.docs.map((d) => toCoin(d.id, d.data()));
  } catch (e) {
    console.error('getPublishedCoins failed', e);
    return [];
  }
}

/** 公開中のコイン1件。非公開・存在しない場合は null */
export async function getPublishedCoin(id: string): Promise<Coin | null> {
  if (!isFirebaseConfigured) return null;
  try {
    const d = await getDoc(doc(db(), 'coins', id));
    if (!d.exists()) return null;
    const coin = toCoin(d.id, d.data());
    return coin.published ? coin : null;
  } catch {
    // 非公開のコインはルールで読み取り拒否される
    return null;
  }
}

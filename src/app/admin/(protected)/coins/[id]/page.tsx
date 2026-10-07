'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CoinForm from '@/components/admin/CoinForm';
import { getCoin, getReviewNotes } from '@/lib/admin';
import type { Coin } from '@/lib/types';

export default function EditCoinPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ coin: Coin; notes: string } | null | undefined>(undefined);

  useEffect(() => {
    Promise.all([getCoin(params.id), getReviewNotes(params.id).catch(() => '')])
      .then(([coin, notes]) => setData(coin ? { coin, notes } : null))
      .catch(() => setData(null));
  }, [params.id]);

  if (data === undefined) return <p className="loading">読み込み中…</p>;
  if (data === null)
    return (
      <p className="loading">
        コインが見つかりません。<Link href="/admin/coins">商品管理へ戻る</Link>
      </p>
    );
  return <CoinForm coin={data.coin} initialReviewNotes={data.notes} />;
}

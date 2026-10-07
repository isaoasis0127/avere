'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deleteCoin, listAllCoins, setCoinPublished } from '@/lib/admin';
import { formatDate, formatYen, originLabel } from '@/lib/format';
import type { Coin } from '@/lib/types';

type Filter = 'all' | 'pub' | 'priv';

export default function AdminCoinsPage() {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listAllCoins()
      .then(setCoins)
      .catch(() => setError('コインを読み込めませんでした。'));
  }, []);

  const counts = useMemo(() => {
    const list = coins ?? [];
    const pub = list.filter((c) => c.published).length;
    return { all: list.length, pub, priv: list.length - pub };
  }, [coins]);

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (coins ?? []).filter((c) => {
      if (filter === 'pub' && !c.published) return false;
      if (filter === 'priv' && c.published) return false;
      if (!kw) return true;
      return [c.name, c.country, c.year].some((v) => v.toLowerCase().includes(kw));
    });
  }, [coins, filter, q]);

  async function toggle(c: Coin) {
    const next = !c.published;
    setCoins((list) => list?.map((x) => (x.id === c.id ? { ...x, published: next } : x)) ?? null);
    try {
      await setCoinPublished(c.id, next);
    } catch {
      setCoins((list) => list?.map((x) => (x.id === c.id ? { ...x, published: !next } : x)) ?? null);
      setError('掲載状態を変更できませんでした。');
    }
  }

  async function remove(c: Coin) {
    if (!window.confirm(`「${c.name}」を削除します。画像も削除され、元に戻せません。よろしいですか？`)) return;
    try {
      await deleteCoin(c);
      setCoins((list) => list?.filter((x) => x.id !== c.id) ?? null);
    } catch {
      setError('削除できませんでした。');
    }
  }

  const tabs: [Filter, string][] = [
    ['all', 'すべて'],
    ['pub', '公開中'],
    ['priv', '非公開'],
  ];

  return (
    <>
      <div className="admin-head">
        <h1 className="mincho">商品管理</h1>
        <Link href="/admin/coins/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          コインを新規登録
        </Link>
      </div>

      <div className="admin-tools">
        <div className="tabs" role="group" aria-label="掲載状態で絞り込み">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className="tab" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {label}（{counts[k]}）
            </button>
          ))}
        </div>
        <label className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E5A47" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.5-4.5" />
          </svg>
          <span className="sr-only">検索</span>
          <input type="search" placeholder="名称・国・年代で検索" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {error && (
        <p className="form-error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      <div className="panel table-wrap">
        {coins === null ? (
          <p className="loading">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="loading">{coins.length === 0 ? 'まだコインが登録されていません。「コインを新規登録」から追加してください。' : '該当するコインはありません。'}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>画像</th>
                <th>コイン名</th>
                <th className="num">価格（税込）</th>
                <th>掲載</th>
                <th>更新日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="mini-coins">
                      <span className="mini-coin">{c.images[0] && <img src={c.images[0].url} alt="" />}</span>
                      <span className="cell-sub" style={{ alignSelf: 'center' }}>{c.images.length}枚</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {c.isSample && <span className="sample-badge" style={{ marginRight: 8 }}>見本</span>}
                      {c.name}
                    </div>
                    <div className="cell-sub">{originLabel(c.country, c.year)}</div>
                  </td>
                  <td className="num price" style={{ fontSize: 19 }}>
                    {formatYen(c.price)}
                  </td>
                  <td>
                    <button type="button" className="toggle" aria-pressed={c.published} aria-label={`${c.name}の掲載を切り替え`} onClick={() => toggle(c)}>
                      <span className="toggle-track">
                        <span className="toggle-knob" />
                      </span>
                      <span className="toggle-label">{c.published ? '公開中' : '非公開'}</span>
                    </button>
                  </td>
                  <td className="cell-sub">{formatDate(c.updatedAt)}</td>
                  <td>
                    <span className="row-actions">
                      <Link href={`/admin/coins/${c.id}`} className="btn">
                        編集
                      </Link>
                      <button type="button" className="btn btn-danger" onClick={() => remove(c)}>
                        削除
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="hint">「非公開」にしたコインは公開サイトに表示されません。変更は最大1分ほどで公開サイトに反映されます。</p>
    </>
  );
}

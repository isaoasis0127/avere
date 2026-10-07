'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listInquiries, setInquiryStatus } from '@/lib/admin';
import { formatDateTime, formatYen } from '@/lib/format';
import { INQUIRY_STATUSES, type Inquiry, type InquiryStatus } from '@/lib/types';
import { useAdmin } from '@/components/admin/AdminContext';

type Filter = 'all' | InquiryStatus;

export default function InquiriesPage() {
  const { refreshOpenCount } = useAdmin();
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    listInquiries()
      .then((list) => {
        setItems(list);
        setSelId(list[0]?.id ?? null);
      })
      .catch(() => setError('問い合わせを読み込めませんでした。'));
  }, []);

  const shown = useMemo(() => (items ?? []).filter((i) => filter === 'all' || i.status === filter), [items, filter]);
  const cur = (items ?? []).find((i) => i.id === selId) ?? null;
  const openCount = (items ?? []).filter((i) => i.status === '未対応').length;

  async function changeStatus(i: Inquiry, status: InquiryStatus) {
    const prev = i.status;
    setItems((list) => list?.map((x) => (x.id === i.id ? { ...x, status } : x)) ?? null);
    try {
      await setInquiryStatus(i.id, status);
      refreshOpenCount();
    } catch {
      setItems((list) => list?.map((x) => (x.id === i.id ? { ...x, status: prev } : x)) ?? null);
      setError('対応状況を変更できませんでした。');
    }
  }

  function mailto(i: Inquiry) {
    const subject = `【Avere】${i.coinName}についてのお問い合わせ`;
    const body = `${i.name} 様\n\nこの度は Avere にお問い合わせいただき、ありがとうございます。\n\n\n----- お問い合わせ内容 -----\n${i.message}`;
    return `mailto:${i.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <>
      <h1 className="mincho" style={{ margin: 0, fontSize: 26 }}>
        問い合わせ管理
      </h1>
      <p className="admin-sub">{items ? `未対応 ${openCount}件 ・ 全 ${items.length}件` : '　'}</p>

      <div className="admin-tools">
        <div className="tabs" role="group" aria-label="対応状況で絞り込み">
          {(['all', ...INQUIRY_STATUSES] as Filter[]).map((k) => (
            <button key={k} type="button" className="tab" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {k === 'all' ? 'すべて' : k}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      {items === null ? (
        <p className="loading">読み込み中…</p>
      ) : items.length === 0 ? (
        <p className="loading">まだお問い合わせはありません。</p>
      ) : (
        <div className="inbox">
          <div className="panel inbox-list">
            {shown.length === 0 && <p className="loading">該当するお問い合わせはありません。</p>}
            {shown.map((i) => (
              <button key={i.id} type="button" className="inbox-item" aria-pressed={i.id === selId} onClick={() => setSelId(i.id)}>
                <span className="body">
                  <span className="line">
                    <span style={{ fontWeight: 700 }} className="ellipsis">
                      {i.name}
                    </span>
                    <span className="cell-sub" style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(i.createdAt)}
                    </span>
                  </span>
                  <span className="ellipsis" style={{ fontSize: 13, color: 'var(--brown)' }}>
                    {i.coinName}
                  </span>
                  <span className="line">
                    <span className="cell-sub ellipsis">{i.message.split('\n')[0]}</span>
                    <span className={`chip chip-${i.status}`}>{i.status}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          {cur && (
            <section className="panel inbox-detail" aria-label="お問い合わせの詳細">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="cell-sub">受付日時 {formatDateTime(cur.createdAt)}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  対応状況
                  <select className="select" style={{ minHeight: 40, padding: '6px 10px' }} value={cur.status} onChange={(e) => changeStatus(cur, e.target.value as InquiryStatus)}>
                    {INQUIRY_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="target-coin" style={{ marginTop: 18 }}>
                <div>
                  <small>対象のコイン</small>
                  <span className="mincho">{cur.coinName}</span>
                  <span style={{ fontSize: 13, color: 'var(--brown)' }}>{formatYen(cur.coinPrice)}</span>
                </div>
              </div>

              <dl className="spec" style={{ marginTop: 20 }}>
                <dt>お名前</dt>
                <dd style={{ fontWeight: 500 }}>{cur.name}</dd>
                <dt>メール</dt>
                <dd>
                  <a href={`mailto:${cur.email}`}>{cur.email}</a>
                </dd>
              </dl>

              <h2 style={{ margin: '22px 0 0', fontSize: 14, fontWeight: 700 }}>お問い合わせ内容</h2>
              <p className="message-box">{cur.message}</p>

              <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={mailto(cur)} className="btn btn-primary">
                  メールで返信
                </a>
                {cur.coinId && (
                  <Link href={`/admin/coins/${cur.coinId}`} className="btn">
                    コイン情報を開く
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

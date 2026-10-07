'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { formatYen } from '@/lib/format';

type Props = {
  coinId: string;
  coinName: string;
  coinPrice: number;
  coinImage: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InquiryForm({ coinId, coinName, coinPrice, coinImage }: Props) {
  const [openedAt] = useState(() => Date.now());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    // 簡易スパム対策: 隠し項目に入力がある / 表示から3秒未満の送信は受け付けたふりをする
    if (honeypot || Date.now() - openedAt < 3000) {
      setSent(true);
      return;
    }
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('お名前・メールアドレス・お問い合わせ内容をご入力ください。');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('メールアドレスの形式をご確認ください。');
      return;
    }
    if (!isFirebaseConfigured) {
      setError('現在送信を受け付けられません。時間をおいてお試しください。');
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db(), 'inquiries'), {
        coinId,
        coinName,
        coinPrice,
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 200),
        message: message.trim().slice(0, 5000),
        status: '未対応',
        createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (err) {
      console.error(err);
      setError('送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。');
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="inquiry" className="inquiry">
      <div className="wrap">
        <div className="inquiry-head">
          <div className="eyebrow">INQUIRY</div>
          <h2 className="mincho">購入のお問い合わせ</h2>
        </div>

        {sent ? (
          <div className="inquiry-card done" role="status">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#86662B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M7.5 12.5l3 3 6-6.5" />
            </svg>
            <h3 className="mincho">お問い合わせを受け付けました</h3>
            <p>
              ありがとうございます。内容を確認のうえ、
              <br />
              担当者よりメールにてご連絡いたします。
            </p>
            <Link href="/" style={{ marginTop: 12, fontSize: 14 }}>
              コイン一覧に戻る
            </Link>
          </div>
        ) : (
          <form className="inquiry-card" onSubmit={onSubmit} noValidate>
            <div className="target-coin">
              <span className="thumb-circle">{coinImage && <img src={coinImage} alt="" />}</span>
              <div>
                <small>対象のコイン</small>
                <span className="mincho">{coinName}</span>
                <span style={{ fontSize: 13, color: 'var(--brown)' }}>
                  {formatYen(coinPrice)}
                </span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="inq-name">
                お名前<span className="req">必須</span>
              </label>
              <input id="inq-name" className="input" type="text" autoComplete="name" placeholder="山田 太郎" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="inq-email">
                メールアドレス<span className="req">必須</span>
              </label>
              <input id="inq-email" className="input" type="email" autoComplete="email" placeholder="example@mail.com" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="inq-message">
                お問い合わせ内容<span className="req">必須</span>
              </label>
              <textarea id="inq-message" className="input" rows={6} maxLength={5000} placeholder="ご購入のご希望、状態についてのご質問などをご記入ください。" value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>
            <div className="hp" aria-hidden="true">
              <label htmlFor="inq-website">Website</label>
              <input id="inq-website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              送信いただいた内容は、<Link href="/privacy">プライバシーポリシー</Link>に基づき適切に管理いたします。
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-lg" disabled={sending}>
              {sending ? '送信中…' : '送信する'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { checkIsAdmin, countOpenInquiries } from '@/lib/admin';
import { AdminContext as Ctx } from '@/components/admin/AdminContext';

type State = 'loading' | 'ok' | 'denied' | 'unconfigured';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<State>(isFirebaseConfigured ? 'loading' : 'unconfigured');
  const [user, setUser] = useState<User | null>(null);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), async (u) => {
      if (!u) {
        router.replace('/admin/login');
        return;
      }
      if (await checkIsAdmin(u.uid)) {
        setUser(u);
        setState('ok');
      } else {
        setState('denied');
      }
    });
  }, [router]);

  const refreshOpenCount = useCallback(() => {
    countOpenInquiries().then(setOpenCount);
  }, []);

  useEffect(() => {
    if (state === 'ok') refreshOpenCount();
  }, [state, pathname, refreshOpenCount]);

  if (state === 'unconfigured') {
    return <p className="loading">Firebase の設定（環境変数）が未登録です。README の手順をご確認ください。</p>;
  }
  if (state === 'loading') return <p className="loading">読み込み中…</p>;
  if (state === 'denied') {
    return (
      <main className="login-wrap">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <p>このアカウントには管理者権限がありません。</p>
          <button type="button" className="btn" onClick={() => signOut(auth()).then(() => router.replace('/admin/login'))}>
            ログアウト
          </button>
        </div>
      </main>
    );
  }

  const nav = [
    { href: '/admin/coins', label: '商品管理', icon: <CoinIcon /> },
    { href: '/admin/inquiries', label: '問い合わせ管理', icon: <MailIcon />, badge: openCount },
  ];

  return (
    <Ctx.Provider value={{ user: user!, refreshOpenCount }}>
      <div className="admin-shell">
        <aside className="admin-side">
          <div className="admin-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Avere Numismatics" className="logo-img logo-img-admin" width={774} height={120} />
            <small>管理画面</small>
          </div>
          <nav className="admin-nav" aria-label="管理メニュー">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? 'page' : undefined}>
                {n.icon}
                {n.label}
                {n.badge ? <span className="badge">{n.badge}</span> : null}
              </Link>
            ))}
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalIcon />
              公開サイトを見る
            </a>
          </nav>
          <button type="button" className="admin-logout" onClick={() => signOut(auth()).then(() => router.replace('/admin/login'))}>
            ログアウト（{user?.email}）
          </button>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </Ctx.Provider>
  );
}

const CoinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E4330" strokeWidth="1.6" aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="5" />
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E4330" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h16v12H4z" />
    <path d="M4 7l8 6 8-6" />
  </svg>
);
const ExternalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E4330" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
  </svg>
);

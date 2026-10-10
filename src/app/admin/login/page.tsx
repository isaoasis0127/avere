'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { checkIsAdmin } from '@/lib/admin';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // すでに管理者としてログイン済みなら一覧へ
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), async (user) => {
      if (user && (await checkIsAdmin(user.uid))) router.replace('/admin/coins');
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isFirebaseConfigured) {
      setError('Firebase の設定（環境変数）が未登録です。');
      return;
    }
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth(), email.trim(), password);
      if (!(await checkIsAdmin(cred.user.uid))) {
        await signOut(auth());
        setError('このアカウントには管理者権限がありません。');
        return;
      }
      router.replace('/admin/coins');
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: 'center', lineHeight: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Avere Numismatics" width={96} height={96} style={{ margin: '0 auto' }} />
          <div style={{ marginTop: 10, fontSize: 13, letterSpacing: '0.2em', color: 'var(--gold-text)' }}>管理画面</div>
        </div>
        <form onSubmit={onSubmit} style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="field">
            <label htmlFor="login-email">メールアドレス</label>
            <input id="login-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="login-pass">パスワード</label>
            <input id="login-pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ minHeight: 52, fontSize: 15, letterSpacing: '0.1em' }} disabled={busy}>
            {busy ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
        <p style={{ margin: '24px 0 0', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          このページは管理者専用です。権限のないアカウントではご利用いただけません。
        </p>
      </div>
    </main>
  );
}

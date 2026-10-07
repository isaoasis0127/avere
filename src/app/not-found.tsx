import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container page" style={{ textAlign: 'center' }}>
        <div className="eyebrow">NOT FOUND</div>
        <h1 className="mincho" style={{ marginTop: 12 }}>
          ページが見つかりません
        </h1>
        <p style={{ color: 'var(--brown)' }}>お探しのコインは販売を終了したか、掲載を停止している可能性があります。</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>
          コイン一覧へ
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}

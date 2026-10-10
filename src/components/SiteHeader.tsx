import Link from 'next/link';

export default function SiteHeader({ current }: { current?: 'list' }) {
  return (
    <>
      <div className="topbar" />
      <header className="site-header">
        <div className="container">
          <Link href="/" className="logo" aria-label="Avere Numismatics トップへ">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Avere Numismatics" className="logo-img" width={774} height={120} />
          </Link>
          <nav className="site-nav" aria-label="メインメニュー">
            <Link href="/" aria-current={current === 'list' ? 'page' : undefined}>
              コイン一覧
            </Link>
            <Link href="/#flow">ご購入の流れ</Link>
            <Link href="/legal">特定商取引法に基づく表記</Link>
          </nav>
        </div>
      </header>
    </>
  );
}

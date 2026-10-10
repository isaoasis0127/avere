import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Avere Numismatics" className="logo-img logo-img-footer" width={774} height={120} />
        </div>
        <div className="footer-links">
          <Link href="/legal">特定商取引法に基づく表記</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
          <span>© Avere</span>
        </div>
      </div>
    </footer>
  );
}

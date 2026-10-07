import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <div className="logo-name" style={{ fontSize: 28 }}>
            Avere
          </div>
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

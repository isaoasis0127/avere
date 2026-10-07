import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = { title: 'プライバシーポリシー' };

// 文面はひな形です。公開前に内容をご確認・調整ください。
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="container page">
        <h1 className="mincho">プライバシーポリシー</h1>
        <p>[事業者名]（以下「当社」）は、Avere におけるお客様の個人情報を以下のとおり取り扱います。</p>

        <h2 className="mincho">取得する情報</h2>
        <p>お問い合わせフォームでご入力いただくお名前、メールアドレス、お問い合わせ内容、および対象商品の情報。</p>

        <h2 className="mincho">利用目的</h2>
        <p>お問い合わせへの回答、商品のご案内・お取引の手続き、およびこれらに必要なご連絡のために利用します。</p>

        <h2 className="mincho">第三者提供</h2>
        <p>法令に基づく場合を除き、ご本人の同意なく第三者に提供することはありません。</p>

        <h2 className="mincho">安全管理</h2>
        <p>取得した情報は、アクセス権限を管理者に限定したシステムで保管し、適切に管理します。</p>

        <h2 className="mincho">お問い合わせ窓口</h2>
        <p>[メールアドレス]</p>

        <p style={{ marginTop: 32, fontSize: 13, color: 'var(--muted)' }}>制定日：[YYYY年MM月DD日]</p>
      </main>
      <SiteFooter />
    </>
  );
}

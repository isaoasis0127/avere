import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = { title: '特定商取引法に基づく表記' };

// [ ] の箇所は公開前に必ず実際の情報に差し替えてください。
const ROWS: [string, string][] = [
  ['販売事業者', '[事業者名]'],
  ['運営責任者', '[氏名]'],
  ['所在地', '[住所]'],
  ['電話番号', '[電話番号]（お問い合わせはフォームよりお願いいたします）'],
  ['メールアドレス', '[メールアドレス]'],
  ['古物商許可', '[公安委員会名] 第[番号]号'],
  ['販売価格', '各商品ページに税込価格で表示しています。'],
  ['商品代金以外の必要料金', '[送料・振込手数料など]'],
  ['お支払い方法', '[銀行振込など]（お問い合わせ後に個別にご案内します）'],
  ['お支払い時期', '[ご成約後◯日以内]'],
  ['商品の引渡し時期', '[ご入金確認後◯営業日以内に発送]'],
  ['返品・交換について', '[返品条件・期限]'],
];

export default function LegalPage() {
  return (
    <>
      <SiteHeader />
      <main className="container page">
        <h1 className="mincho">特定商取引法に基づく表記</h1>
        <table>
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <SiteFooter />
    </>
  );
}

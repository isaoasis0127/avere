import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CoinCard from '@/components/CoinCard';
import PurchaseFlow from '@/components/PurchaseFlow';
import SortSelect from '@/components/SortSelect';
import { cachedPublishedCoins } from '@/lib/cached';
import { sortCoins, type SortKey } from '@/lib/coins';

const SORTS: SortKey[] = ['new', 'price_desc', 'price_asc'];

export default async function HomePage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort: SortKey = SORTS.includes(searchParams.sort as SortKey) ? (searchParams.sort as SortKey) : 'new';
  const coins = sortCoins(await cachedPublishedCoins(), sort);

  return (
    <>
      <SiteHeader current="list" />
      <main>
        <section className="container hero">
          <div className="hero-text">
            <div className="eyebrow">COLLECTION</div>
            <h1 className="mincho">時を経て輝く、一枚を。</h1>
            <p>
              Avere は、来歴と状態を確かめた販売可能なアンティークコインをご紹介しています。ご購入はお問い合わせのうえ、担当者より個別にご案内いたします。
            </p>
          </div>
          <div className="list-tools">
            <span className="count">
              販売中 <strong>{coins.length}</strong> 点
            </span>
            <SortSelect value={sort} />
          </div>
        </section>

        <section className="container" aria-label="コイン一覧">
          {coins.length === 0 ? (
            <p className="empty">現在ご紹介できるコインはございません。新しい入荷をお待ちください。</p>
          ) : (
            <div className="coin-grid">
              {coins.map((c, i) => (
                <CoinCard key={c.id} coin={c} eager={i < 4} />
              ))}
            </div>
          )}
        </section>

        <PurchaseFlow />
      </main>
      <SiteFooter />
    </>
  );
}

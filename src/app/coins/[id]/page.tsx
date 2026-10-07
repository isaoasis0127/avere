import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CoinGallery from '@/components/CoinGallery';
import InquiryForm from '@/components/InquiryForm';
import { cachedPublishedCoin } from '@/lib/cached';
import { coverImage } from '@/lib/coins';
import { formatYen, gradeLabel, originLabel } from '@/lib/format';
import { INTRO_SECTIONS } from '@/lib/types';

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const coin = await cachedPublishedCoin(params.id);
  if (!coin) return { title: 'コインが見つかりません' };
  const description = (coin.intro.overview || `${originLabel(coin.country, coin.year)} ${coin.name}`).slice(0, 120);
  const cover = coverImage(coin);
  return {
    title: coin.name,
    description,
    openGraph: { title: `${coin.name}｜Avere`, description, images: cover ? [cover] : undefined },
  };
}

export default async function CoinDetailPage({ params }: Params) {
  const coin = await cachedPublishedCoin(params.id);
  if (!coin) notFound();

  const specs = (
    [
      ['発行国・地域', coin.country],
      ['年代', coin.year],
      ['額面', coin.denomination],
      ['素材', coin.material],
      ['鑑定', gradeLabel(coin.gradingCompany, coin.grade)],
    ] as [string, string][]
  ).filter(([, v]) => v);

  const sections = INTRO_SECTIONS.filter(({ key }) => coin.intro[key].trim());

  return (
    <>
      <SiteHeader />
      <main>
        <nav className="container breadcrumb" aria-label="パンくずリスト">
          <Link href="/">コイン一覧</Link>
          <span aria-hidden="true">　›　</span>
          <span>{coin.name}</span>
        </nav>

        <section className="container detail">
          <CoinGallery name={coin.name} images={coin.images} />

          <div className="detail-info">
            {coin.isSample && (
              <p style={{ margin: '0 0 12px' }}>
                <span className="sample-badge">見本</span>
                <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--muted)' }}>この商品は表示例のための見本です。</span>
              </p>
            )}
            <div className="detail-origin">{originLabel(coin.country, coin.year)}</div>
            <h1 className="mincho">{coin.name}</h1>
            <div className="detail-price">
              <span>価格（税込）</span>
              <span className="price">{formatYen(coin.price)}</span>
            </div>
            <a href="#inquiry" className="btn btn-primary btn-lg" style={{ marginTop: 28 }}>
              このコインについて問い合わせる
            </a>
            <p className="note">オンライン決済はございません。お問い合わせ後、担当者より個別にご案内いたします。</p>

            {specs.length > 0 && (
              <>
                <h2 className="mincho">基本情報</h2>
                <dl className="spec">
                  {specs.map(([k, v]) => (
                    <div key={k} style={{ display: 'contents' }}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {sections.map(({ key, title }) => (
              <section key={key} className="intro-section">
                <h2 className="mincho">{title}</h2>
                <p className="detail-desc">{coin.intro[key]}</p>
              </section>
            ))}
          </div>
        </section>

        <InquiryForm coinId={coin.id} coinName={coin.name} coinPrice={coin.price} coinImage={coverImage(coin)} />
      </main>
      <SiteFooter />
    </>
  );
}

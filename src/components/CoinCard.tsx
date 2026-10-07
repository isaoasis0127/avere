import Link from 'next/link';
import type { Coin } from '@/lib/types';
import { coverImage } from '@/lib/coins';
import { formatYen, gradeLabel, originLabel } from '@/lib/format';
import CoinImage from './CoinImage';

export default function CoinCard({ coin, eager }: { coin: Coin; eager?: boolean }) {
  const grade = gradeLabel(coin.gradingCompany, coin.grade);
  return (
    <Link href={`/coins/${coin.id}`} className="card">
      <div className="card-media">
        <CoinImage src={coverImage(coin)} alt={coin.name} eager={eager} />
        {grade && <span className="card-grade">{grade}</span>}
      </div>
      <div className="card-body">
        {coin.isSample && (
          <span>
            <span className="sample-badge">見本</span>
          </span>
        )}
        <div className="card-origin">{originLabel(coin.country, coin.year)}</div>
        <div className="card-name">{coin.name}</div>
        <div className="card-price">
          <span>価格（税込）</span>
          <span className="price">{formatYen(coin.price)}</span>
        </div>
      </div>
    </Link>
  );
}

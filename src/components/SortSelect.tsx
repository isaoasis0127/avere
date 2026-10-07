'use client';

import { useRouter } from 'next/navigation';

export default function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  return (
    <>
      <label htmlFor="sort" className="count">
        並び替え
      </label>
      <select
        id="sort"
        className="select"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v === 'new' ? '/' : `/?sort=${v}`, { scroll: false });
        }}
      >
        <option value="new">新着順</option>
        <option value="price_desc">価格の高い順</option>
        <option value="price_asc">価格の安い順</option>
      </select>
    </>
  );
}

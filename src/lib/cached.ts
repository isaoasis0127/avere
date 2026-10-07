import { unstable_cache } from 'next/cache';
import { getPublishedCoin, getPublishedCoins } from './coins';

/** 管理画面で更新してから公開サイトに反映されるまでの最大秒数 */
const REVALIDATE_SECONDS = 60;

export const cachedPublishedCoins = unstable_cache(getPublishedCoins, ['published-coins'], {
  revalidate: REVALIDATE_SECONDS,
});

export const cachedPublishedCoin = unstable_cache(
  (id: string) => getPublishedCoin(id),
  ['published-coin'],
  { revalidate: REVALIDATE_SECONDS },
);

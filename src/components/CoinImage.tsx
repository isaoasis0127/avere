/* eslint-disable @next/next/no-img-element */

/** 画像があれば表示、なければコイン型のプレースホルダー */
export default function CoinImage({
  src,
  alt,
  label,
  eager,
  className,
}: {
  src?: string;
  alt: string;
  label?: string;
  eager?: boolean;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />;
  }
  return (
    <div className="coin-placeholder" role="img" aria-label={`${alt}（画像準備中）`}>
      {label ?? 'NO IMAGE'}
    </div>
  );
}

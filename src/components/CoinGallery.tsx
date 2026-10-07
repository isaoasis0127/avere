'use client';

import { useEffect, useRef, useState } from 'react';
import CoinImage from './CoinImage';
import type { CoinImage as Img } from '@/lib/types';

const ZoomIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.5-4.5M11 8v6M8 11h6" />
  </svg>
);

/** 2枚以上あるときの既定ラベル（1枚目=表面, 2枚目=裏面） */
function labelOf(i: number) {
  return i === 0 ? '表面' : i === 1 ? '裏面' : `写真${i + 1}`;
}

export default function CoinGallery({ name, images }: { name: string; images: Img[] }) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const count = images.length;
  const cur = images[index];
  const label = count > 1 ? labelOf(index) : '';

  const step = (d: number) => count > 1 && setIndex((i) => (i + d + count) % count);

  useEffect(() => {
    if (!zoomOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomOpen(false);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomOpen, count]);

  useEffect(() => setZoomed(false), [index, zoomOpen]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches.length === 1 ? e.touches[0].clientX : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || zoomed) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  };

  return (
    <div className="detail-gallery">
      <button
        type="button"
        className="gallery-main"
        onClick={() => cur && setZoomOpen(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label={cur ? `${label || '画像'}を拡大する` : '画像準備中'}
      >
        <CoinImage src={cur?.url} alt={`${name} ${label}`.trim()} eager />
        {cur && (
          <span className="zoom-hint">
            <ZoomIcon />
            クリックで拡大
          </span>
        )}
      </button>

      {count > 1 && (
        <div className="thumbs" role="group" aria-label="表示する画像">
          {images.map((img, i) => (
            <button key={img.url} type="button" className="thumb" aria-pressed={index === i} onClick={() => setIndex(i)}>
              <span className="thumb-box">
                <CoinImage src={img.url} alt="" />
              </span>
              <span>{labelOf(i)}</span>
            </button>
          ))}
        </div>
      )}

      {zoomOpen && cur && (
        <div className="zoom-overlay" role="dialog" aria-modal="true" aria-label={`${name}の拡大表示`}>
          <button ref={closeRef} type="button" className="icon-btn zoom-close" onClick={() => setZoomOpen(false)} aria-label="拡大表示を閉じる">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="zoom-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cur.url}
              alt={`${name} ${label}`.trim()}
              className={zoomed ? 'zoomed' : undefined}
              onClick={() => setZoomed((z) => !z)}
            />
          </div>
          {count > 1 && (
            <div className="zoom-switch" role="group" aria-label="表示する画像">
              {images.map((img, i) => (
                <button key={img.url} type="button" className="pill" aria-pressed={index === i} onClick={() => setIndex(i)}>
                  {labelOf(i)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

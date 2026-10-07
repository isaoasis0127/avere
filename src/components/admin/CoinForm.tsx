'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ACCEPTED_TYPES,
  MAX_SOURCE_BYTES,
  createCoin,
  deleteCoin,
  generateIntro,
  introIsEmpty,
  newCoinId,
  removeImage,
  saveReviewNotes,
  updateCoin,
  uploadCoinImage,
} from '@/lib/admin';
import {
  EMPTY_INTRO,
  INTRO_SECTIONS,
  MAX_IMAGES,
  type Coin,
  type CoinFields,
  type CoinImage,
  type CoinIntro,
} from '@/lib/types';

const MATERIALS = ['', '金', '銀', '銅', '白金', 'その他'];

type Props = { coin?: Coin; initialReviewNotes?: string };

export default function CoinForm({ coin, initialReviewNotes = '' }: Props) {
  const router = useRouter();
  const isNew = !coin;
  const coinId = useRef(coin?.id ?? '');

  const [f, setF] = useState({
    name: coin?.name ?? '',
    price: coin ? String(coin.price) : '',
    country: coin?.country ?? '',
    year: coin?.year ?? '',
    denomination: coin?.denomination ?? '',
    material: coin?.material ?? '',
    gradingCompany: coin?.gradingCompany ?? '',
    grade: coin?.grade ?? '',
    isSample: coin?.isSample ?? false,
    published: coin?.published ?? false,
  });
  const [intro, setIntro] = useState<CoinIntro>(coin?.intro ?? EMPTY_INTRO);
  const [reviewNotes, setReviewNotes] = useState(initialReviewNotes);
  const [images, setImages] = useState<CoinImage[]>(coin?.images ?? []);

  /** 今回の編集でアップロードした画像（キャンセル時に削除） */
  const freshPaths = useRef<Set<string>>(new Set());
  /** 保存済みの画像のうち、保存時に削除するもの */
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  /** 直近に AI が生成した文章（編集されたかの判定用） */
  const lastDraft = useRef<CoinIntro | null>(null);

  const [uploading, setUploading] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiDone, setAiDone] = useState(false);

  const getId = () => {
    if (!coinId.current) coinId.current = newCoinId();
    return coinId.current;
  };

  // 未保存のまま離れるときに確認
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const touch = () => setDirty(true);
  const set =
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setF((s) => ({ ...s, [k]: e.target.value }));
      touch();
    };

  // ---------- 画像 ----------

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'JPG・PNG・WebP の画像を選択してください。';
    if (file.size > MAX_SOURCE_BYTES) return '15MB 以下の画像を選択してください。';
    return null;
  }

  function discard(path: string) {
    if (freshPaths.current.has(path)) {
      freshPaths.current.delete(path);
      removeImage(path);
    } else {
      setRemovedPaths((p) => [...p, path]);
    }
  }

  async function addFiles(list: FileList | File[]) {
    setError('');
    const files = Array.from(list);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return setError(`画像は最大${MAX_IMAGES}枚までです。`);
    if (files.length > room) setError(`画像は最大${MAX_IMAGES}枚までです。先頭の${room}枚のみ追加します。`);
    for (const file of files.slice(0, room)) {
      const bad = validateFile(file);
      if (bad) {
        setError(bad);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const img = await uploadCoinImage(getId(), file);
        freshPaths.current.add(img.path);
        setImages((arr) => (arr.length < MAX_IMAGES ? [...arr, img] : arr));
        touch();
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : '画像をアップロードできませんでした。');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function replaceAt(index: number, file: File) {
    const bad = validateFile(file);
    if (bad) return setError(bad);
    setError('');
    setUploading((n) => n + 1);
    try {
      const img = await uploadCoinImage(getId(), file);
      freshPaths.current.add(img.path);
      const old = images[index];
      setImages((arr) => arr.map((x, i) => (i === index ? img : x)));
      if (old) discard(old.path);
      touch();
    } catch {
      setError('画像を差し替えできませんでした。');
    } finally {
      setUploading((n) => n - 1);
    }
  }

  function removeAt(index: number) {
    const old = images[index];
    setImages((arr) => arr.filter((_, i) => i !== index));
    if (old) discard(old.path);
    touch();
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    setImages((arr) => {
      const next = [...arr];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    touch();
  }

  // ---------- AI ----------

  async function runAi() {
    setAiError('');
    setAiDone(false);
    const edited =
      !introIsEmpty(intro) &&
      (!lastDraft.current || INTRO_SECTIONS.some(({ key }) => lastDraft.current![key] !== intro[key]));
    if (edited && !window.confirm('入力済み・編集済みの紹介文を、新しい生成結果で上書きします。よろしいですか？')) return;

    setAiBusy(true);
    try {
      const draft = await generateIntro({
        name: f.name,
        country: f.country,
        year: f.year,
        denomination: f.denomination,
        material: f.material,
        gradingCompany: f.gradingCompany,
        grade: f.grade,
        imagePaths: images.map((i) => i.path),
      });
      const next: CoinIntro = {
        overview: draft.overview,
        history: draft.history,
        design: draft.design,
        appeal: draft.appeal,
      };
      setIntro(next);
      lastDraft.current = next;
      setReviewNotes(draft.needsReview.map((s) => `・${s}`).join('\n'));
      setAiDone(true);
      touch();
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI 生成に失敗しました。');
    } finally {
      setAiBusy(false);
    }
  }

  // ---------- 保存・削除 ----------

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const price = Number(f.price.replace(/[^\d]/g, ''));
    if (!f.name.trim()) return setError('名称を入力してください。');
    if (!f.price.trim() || !Number.isFinite(price) || price <= 0) return setError('価格を正しく入力してください。');
    if (images.length === 0) return setError('画像を1枚以上登録してください。');
    if (uploading > 0) return setError('画像のアップロードが終わるまでお待ちください。');

    setSaving(true);
    try {
      const id = getId();
      const fields: CoinFields = {
        name: f.name.trim(),
        price,
        country: f.country.trim(),
        year: f.year.trim(),
        denomination: f.denomination.trim(),
        material: f.material,
        gradingCompany: f.gradingCompany.trim(),
        grade: f.grade.trim(),
        images,
        intro: {
          overview: intro.overview.trim(),
          history: intro.history.trim(),
          design: intro.design.trim(),
          appeal: intro.appeal.trim(),
        },
        isSample: f.isSample,
        published: f.published,
      };
      if (isNew) await createCoin(id, fields);
      else await updateCoin(id, fields);
      await saveReviewNotes(id, reviewNotes.trim());
      await Promise.all(removedPaths.map(removeImage));
      freshPaths.current.clear();
      setDirty(false);
      router.push('/admin/coins');
    } catch (err) {
      console.error(err);
      // 入力内容は保持したままエラーを表示
      setError('保存できませんでした。入力内容はそのまま残っています。通信環境を確認して、もう一度「保存する」を押してください。');
      setSaving(false);
    }
  }

  function onCancel() {
    if (dirty && !window.confirm('保存していない変更を破棄します。よろしいですか？')) return;
    freshPaths.current.forEach((p) => removeImage(p));
    freshPaths.current.clear();
    setDirty(false);
    router.push('/admin/coins');
  }

  async function onDelete() {
    if (!coin) return;
    if (!window.confirm(`「${coin.name}」を削除します。画像も削除され、元に戻せません。よろしいですか？`)) return;
    setSaving(true);
    try {
      await deleteCoin({ ...coin, images: [...coin.images, ...images] });
      setDirty(false);
      router.push('/admin/coins');
    } catch {
      setError('削除できませんでした。');
      setSaving(false);
    }
  }

  const busy = saving || uploading > 0;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="cell-sub" style={{ fontSize: 13 }}>
        <Link href="/admin/coins">商品管理</Link>　›　{isNew ? '新規登録' : '編集'}
      </div>
      <div className="admin-head" style={{ marginTop: 8 }}>
        <h1 className="mincho">{isNew ? 'コインを新規登録' : 'コインを編集'}</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {coin?.published && (
            <a href={`/coins/${coin.id}`} target="_blank" rel="noreferrer" className="btn">
              公開ページを見る
            </a>
          )}
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            キャンセル
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {saving ? '保存中…' : '保存する'}
          </button>
        </div>
      </div>
      <p className="hint">運用の流れ：画像登録 → 補足情報入力 → AI で紹介文を生成 → 確認・編集 → 公開</p>

      {error && (
        <p className="form-error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      <div className="edit-grid">
        <div className="edit-col-main">
          {/* ---- 画像 ---- */}
          <fieldset className="fieldset">
            <legend>
              画像<span className="req">必須・最大{MAX_IMAGES}枚</span>
            </legend>
            <div className="image-grid">
              {images.map((img, i) => (
                <div key={img.path || img.url} className="image-tile">
                  <div className="image-frame">
                    <img src={img.url} alt={`画像${i + 1}`} />
                    {i === 0 && <span className="cover-badge">代表画像</span>}
                  </div>
                  <div className="image-actions">
                    <button type="button" className="icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`画像${i + 1}を前へ`}>
                      ←
                    </button>
                    <button type="button" className="icon-sm" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`画像${i + 1}を後ろへ`}>
                      →
                    </button>
                    <label className="icon-sm" style={{ cursor: 'pointer' }}>
                      差替
                      <input
                        type="file"
                        accept={ACCEPTED_TYPES.join(',')}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) replaceAt(i, file);
                        }}
                      />
                    </label>
                    <button type="button" className="icon-sm danger" onClick={() => removeAt(i)} aria-label={`画像${i + 1}を削除`}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
              {images.length + uploading < MAX_IMAGES && (
                <DropZone onFiles={addFiles} />
              )}
              {Array.from({ length: uploading }).map((_, i) => (
                <div key={`up-${i}`} className="image-tile">
                  <div className="image-frame uploading">アップロード中…</div>
                </div>
              ))}
            </div>
            <p className="hint" style={{ margin: 0 }}>
              JPG・PNG・WebP（15MB まで）。表面・裏面・その他の順がおすすめです。先頭の画像が一覧の代表画像になります。
            </p>
          </fieldset>

          {/* ---- 基本情報 ---- */}
          <fieldset className="fieldset">
            <legend>基本情報</legend>
            <div className="field">
              <label htmlFor="c-name">
                名称<span className="req">必須</span>
              </label>
              <input id="c-name" className="input" value={f.name} onChange={set('name')} maxLength={200} />
            </div>
            <div className="field" style={{ maxWidth: 320 }}>
              <label htmlFor="c-price">
                価格（円・税込）<span className="req">必須</span>
              </label>
              <input id="c-price" className="input" inputMode="numeric" style={{ textAlign: 'right' }} value={f.price} onChange={set('price')} placeholder="1000000" />
            </div>
          </fieldset>

          {/* ---- 補足情報 ---- */}
          <fieldset className="fieldset">
            <legend>補足情報（任意）</legend>
            <div className="two-col">
              <div className="field">
                <label htmlFor="c-country">発行国・地域</label>
                <input id="c-country" className="input" value={f.country} onChange={set('country')} maxLength={100} />
              </div>
              <div className="field">
                <label htmlFor="c-year">年代</label>
                <input id="c-year" className="input" value={f.year} onChange={set('year')} placeholder="1839年 / 紀元前5世紀" maxLength={100} />
              </div>
              <div className="field">
                <label htmlFor="c-denom">額面</label>
                <input id="c-denom" className="input" value={f.denomination} onChange={set('denomination')} placeholder="5ポンド" maxLength={100} />
              </div>
              <div className="field">
                <label htmlFor="c-material">素材</label>
                <select id="c-material" className="input" value={f.material} onChange={set('material')}>
                  {MATERIALS.map((m) => (
                    <option key={m} value={m}>
                      {m || '未選択'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-gcompany">鑑定会社</label>
                <input id="c-gcompany" className="input" value={f.gradingCompany} onChange={set('gradingCompany')} placeholder="PCGS / NGC" maxLength={100} />
              </div>
              <div className="field">
                <label htmlFor="c-grade">グレード</label>
                <input id="c-grade" className="input" value={f.grade} onChange={set('grade')} placeholder="PF62" maxLength={100} />
              </div>
            </div>
          </fieldset>

          {/* ---- 紹介文 ---- */}
          <fieldset className="fieldset">
            <legend>紹介文</legend>
            <div className="ai-bar">
              <div>
                <div style={{ fontWeight: 500 }}>AI で紹介文の下書きを作成</div>
                <div className="cell-sub">登録した画像と補足情報をもとに、4つの項目を作成します。内容を確認・編集してから公開してください。</div>
              </div>
              <button type="button" className="btn btn-gold" onClick={runAi} disabled={aiBusy || uploading > 0}>
                <SparkIcon />
                {aiBusy ? '生成中…（30秒ほど）' : introIsEmpty(intro) ? 'AIで紹介文を生成' : 'AIで再生成'}
              </button>
            </div>
            {aiError && (
              <p className="form-error" role="alert">
                {aiError}
              </p>
            )}
            {aiDone && (
              <p className="hint" role="status" style={{ margin: 0 }}>
                下書きを作成しました。「要確認」の項目を確かめてから公開してください。
              </p>
            )}

            {INTRO_SECTIONS.map(({ key, title }, i) => (
              <div key={key} className="field">
                <label htmlFor={`intro-${key}`}>
                  {['①', '②', '③', '④'][i]} {title}
                </label>
                <textarea
                  id={`intro-${key}`}
                  className="input"
                  rows={5}
                  maxLength={3000}
                  value={intro[key]}
                  onChange={(e) => {
                    setIntro((s) => ({ ...s, [key]: e.target.value }));
                    touch();
                  }}
                />
              </div>
            ))}

            <div className="review-box">
              <label htmlFor="review-notes" className="review-title">
                要確認（管理者のみ・公開ページには表示されません）
              </label>
              <textarea
                id="review-notes"
                className="input"
                rows={4}
                maxLength={5000}
                placeholder="AI が画像だけでは確定できなかった点がここに表示されます。確認が済んだら削除してかまいません。"
                value={reviewNotes}
                onChange={(e) => {
                  setReviewNotes(e.target.value);
                  touch();
                }}
              />
            </div>
          </fieldset>
        </div>

        <div className="edit-col-side">
          <fieldset className="fieldset">
            <legend>掲載状態</legend>
            <label className="radio-card">
              <input type="radio" name="pub" checked={f.published} onChange={() => (setF((s) => ({ ...s, published: true })), touch())} />
              公開する<small>サイトに表示</small>
            </label>
            <label className="radio-card">
              <input type="radio" name="pub" checked={!f.published} onChange={() => (setF((s) => ({ ...s, published: false })), touch())} />
              非公開にする<small>管理画面のみ</small>
            </label>
            <label className="check-row">
              <input type="checkbox" checked={f.isSample} onChange={(e) => (setF((s) => ({ ...s, isSample: e.target.checked })), touch())} />
              見本（サンプル）商品として表示する
            </label>
          </fieldset>

          {!isNew && (
            <div className="danger-zone">
              <span>このコインを削除します。元に戻せません。</span>
              <button type="button" className="btn btn-danger" onClick={onDelete} disabled={saving}>
                削除する
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

function DropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="image-tile">
      <label
        className={`drop${drag ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86662B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />
        </svg>
        画像を追加
        <br />
        ドラッグ＆ドロップ / クリック
        <input
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

const SparkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);

export const MAX_IMAGES = 4;

export type CoinImage = {
  url: string;
  /** Firebase Storage 上のパス（削除用） */
  path: string;
};

/** 紹介文（公開ページに表示） */
export type CoinIntro = {
  /** ① コインの概要 */
  overview: string;
  /** ② 歴史と背景 */
  history: string;
  /** ③ 表裏の意匠の魅力 */
  design: string;
  /** ④ コレクションとしての魅力 */
  appeal: string;
};

export const INTRO_SECTIONS: { key: keyof CoinIntro; title: string }[] = [
  { key: 'overview', title: 'コインの概要' },
  { key: 'history', title: '歴史と背景' },
  { key: 'design', title: '表裏の意匠の魅力' },
  { key: 'appeal', title: 'コレクションとしての魅力' },
];

export const EMPTY_INTRO: CoinIntro = { overview: '', history: '', design: '', appeal: '' };

export type Coin = {
  id: string;
  name: string;
  price: number;
  /** 補足情報（任意） */
  country: string;
  year: string;
  denomination: string;
  material: string;
  gradingCompany: string;
  grade: string;
  /** 先頭が一覧の代表画像。最大4枚 */
  images: CoinImage[];
  intro: CoinIntro;
  /** 見本（サンプル）商品として明示する */
  isSample: boolean;
  published: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CoinFields = Omit<Coin, 'id' | 'createdAt' | 'updatedAt'>;

/** 管理者専用メモ（公開ページからは読めない別コレクションに保存） */
export type CoinPrivate = {
  /** AI が「要確認」とした事項。管理者が確認用に編集できる */
  reviewNotes: string;
};

export const INQUIRY_STATUSES = ['未対応', '対応中', '完了'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export type Inquiry = {
  id: string;
  coinId: string;
  coinName: string;
  coinPrice: number;
  name: string;
  email: string;
  message: string;
  status: InquiryStatus;
  createdAt: number;
};

/** AI 生成 API の返り値 */
export type AiDraft = CoinIntro & { needsReview: string[] };

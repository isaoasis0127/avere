import Anthropic from '@anthropic-ai/sdk';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { getImage, isCoinKey } from '@/lib/server/r2';
import { MAX_IMAGES, type AiDraft } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SYSTEM = `あなたはアンティークコイン販売店「Avere」の商品紹介文を書く、歴史に詳しいライターです。
管理者が入力した補足情報と商品画像をもとに、公開ページに載せる紹介文の「下書き」を日本語で作成します。下書きは管理者が確認・編集してから公開されます。

# いちばん大切な方針
コインそのものの説明だけでは、どのコインも似た文章になり、内容が薄くなります。
このコインを発行した人物、肖像に刻まれた人物、またはコインが生まれた出来事と時代を「史実」に基づいて語り、
手に取る人が「この一枚の向こうに、これだけの歴史がある」と重みと価値を感じられる文章にしてください。
同じ種類のコインでも、人物と時代の物語によって、そのコインならではの紹介になるようにします。

# 各項目の書き方
- overview（コインの概要／150〜250字）
  どの時代の、誰によって（誰の名で）発行されたコインかを示し、その人物や時代への興味を引く導入にする。
- history（歴史と背景／600〜1000字・2〜4段落）※最も力を入れる項目
  中心は、コインに関わる歴史的人物の紹介（史実）。
  人物の出自、権力や地位に至った経緯、在位・活動期の主な出来事、功績や政策、人物像を伝える逸話、その最期や後世の評価などを、物語として読める流れで書く。
  あわせて、当時の国家や社会の状況（戦争、政変、経済、宗教など）と、このコインが発行された意味（即位、戦勝、記念、宣伝など）をつなげて説明する。
  肖像が神話上の存在や象徴のみの場合は、その発行主体（都市・王朝・国家）の歴史と、象徴に込めた意図を中心にする。
  段落の区切りには空行（\\n\\n）を入れる。
- design（表裏の意匠の魅力／200〜350字）
  表面・裏面の図柄、銘文、称号、持ち物などが、その人物や時代について何を語っているかを読み解く。画像で確認できる範囲を中心に書く。
- appeal（コレクションとしての魅力／150〜300字）
  その人物と時代を、実物として手元に置いて眺める楽しみや、歴史と向き合う喜びを伝える。

# 文章の方向性
- 読みやすく上品な「です・ます」調。落ち着いた語り口で、誇張や煽りは避ける。
- 見出し、箇条書き、Markdown 記号は使わない。

# 史実の扱い（最重要）
- 人物の特定は、まず管理者が入力した名称・補足情報に従う。入力がなく画像からも確実に特定できない場合は、人物を断定せず、時代・地域の歴史を中心に書き、needs_review に「人物（発行者・肖像）の確認」を挙げる。
- 本文に書くのは、歴史学で広く認められている史実に限る。
- 古代の史料に基づく伝承や、研究者の間で見解が分かれる内容は「〜と伝えられています」「〜とされています」と書き分け、事実と断定しない。
- 架空の会話・心情描写・創作した逸話は書かない。
- 自信のない固有名詞、年号、数字、出来事は本文に書かず、needs_review に「確認してほしい点」として具体的に書く。
- 画像だけでは確定できないこと（発行年、ミントマーク、額面、素材、銘文の読み、図柄の特定など）は本文で断定せず、needs_review に書く。
- 真贋、希少性（「希少」「現存◯枚」など）、保存状態や鑑定グレードを推測で断定しない。グレードは入力された値をそのまま紹介する場合のみ言及してよい。
- 値上がりの期待、資産価値の保証、投資としての利益を示唆する表現は書かない。「歴史的な価値」「歴史の重み」は、史実の内容によって伝える。
- 画像が補足情報と食い違って見える場合は needs_review に書く。

# 出力
次の形の JSON オブジェクト「だけ」を出力する。前置き・説明・コードブロック記号（\`\`\`）は付けない。文字列中の改行は \\n で表す。
{"overview": "...", "history": "...", "design": "...", "appeal": "...", "needs_review": ["管理者に確認してほしい事項", "..."]}`;

/** 本文から最初の { 〜 最後の } を取り出して JSON として読む */
function parseDraft(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

type Body = {
  name?: string;
  country?: string;
  year?: string;
  denomination?: string;
  material?: string;
  gradingCompany?: string;
  grade?: string;
  imagePaths?: string[];
};

async function loadImage(key: string): Promise<Anthropic.ImageBlockParam | null> {
  const img = await getImage(key);
  if (!img || img.bytes.byteLength > MAX_IMAGE_BYTES) return null;
  const type = img.contentType.split(';')[0].trim();
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) return null;
  return {
    type: 'image',
    source: { type: 'base64', media_type: type as 'image/jpeg', data: Buffer.from(img.bytes).toString('base64') },
  };
}

function clip(s: unknown, n = 200): string {
  return typeof s === 'string' ? s.trim().slice(0, n) : '';
}

export async function POST(req: Request) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return Response.json({ type: 'error', message: '管理者としてログインしてください。' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { type: 'error', message: 'AI サービスの API キー（ANTHROPIC_API_KEY）が設定されていません。' },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ type: 'error', message: 'リクエストが不正です。' }, { status: 400 });
  }

  const urls = (body.imagePaths ?? []).filter(isCoinKey).slice(0, MAX_IMAGES);
  const info = [
    ['名称', clip(body.name)],
    ['発行国・地域', clip(body.country)],
    ['年代', clip(body.year)],
    ['額面', clip(body.denomination)],
    ['素材', clip(body.material)],
    ['鑑定会社', clip(body.gradingCompany)],
    ['グレード', clip(body.grade)],
  ]
    .map(([k, v]) => `- ${k}: ${v || '（未入力）'}`)
    .join('\n');

  if (!clip(body.name) && urls.length === 0) {
    return Response.json({ type: 'error', message: '名称または画像を登録してから生成してください。' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      // 処理中であることを先に返す（長い処理でも接続が切れないように）
      send({ type: 'progress' });
      const keepAlive = setInterval(() => send({ type: 'progress' }), 5000);

      try {
        const images = (await Promise.all(urls.map((u) => loadImage(u).catch(() => null)))).filter(
          (x): x is Anthropic.ImageBlockParam => x !== null,
        );

        const client = new Anthropic();
        const msg = await client.messages.create({
          model: MODEL,
          max_tokens: 16000,
          system: SYSTEM,
          messages: [
            {
              role: 'user',
              content: [
                ...images.flatMap((img, i) => [{ type: 'text' as const, text: `画像${i + 1}${i === 0 ? '（代表画像）' : ''}` }, img]),
                {
                  type: 'text',
                  text: `次のコインの紹介文の下書きを作成してください。コインに関わる歴史的人物と時代の史実を中心に、このコインならではの物語として書いてください。\n\n# 管理者が入力した補足情報\n${info}\n\n画像は${images.length}枚です。`,
                },
              ],
            },
          ],
        });

        // 最新モデルはツールの強制指定に非対応のため、本文の JSON を読み取る
        const text = msg.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        const x = parseDraft(text);
        if (!x) throw new Error(`AI の出力を読み取れませんでした: ${text.slice(0, 120)}`);
        const data: AiDraft = {
          overview: clip(x.overview, 2000),
          history: clip(x.history, 4000),
          design: clip(x.design, 2000),
          appeal: clip(x.appeal, 2000),
          needsReview: Array.isArray(x.needs_review) ? x.needs_review.map((s) => clip(s, 500)).filter(Boolean) : [],
        };
        send({ type: 'result', data });
      } catch (e) {
        console.error('AI generation failed', e);
        const status = e instanceof Anthropic.APIError ? e.status : undefined;
        const detail = e instanceof Error ? e.message : String(e);
        let message: string;
        if (status === 401) message = 'AI サービスの API キーが無効です。';
        else if (/credit balance/i.test(detail)) message = 'AI サービスの残高が不足しています。Claude Console でクレジットを追加してください。';
        else if (status === 404 || /model/i.test(detail)) message = `指定のモデル（${MODEL}）が使えません。ANTHROPIC_MODEL を確認してください。`;
        else if (status === 429 || status === 529) message = 'AI サービスが混み合っています。少し時間をおいて再度お試しください。';
        else message = 'AI 生成に失敗しました。もう一度お試しください。';
        // 管理者専用の画面なので、原因の手がかりを添える
        send({ type: 'error', message: `${message}（詳細: ${status ?? ''} ${detail.slice(0, 200)}）` });
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

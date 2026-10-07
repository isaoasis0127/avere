# Avere｜コイン販売サイト

販売可能なアンティークコインを紹介し、購入のお問い合わせにつなげるサイトです。
カート・オンライン決済・会員登録はなく、お問い合わせ後に個別対応で購入を進めます。

- 公開サイト：コイン一覧 / コイン詳細（画像最大4枚の切り替え・拡大、紹介文4項目）/ 購入お問い合わせ
- 管理画面（`/admin`）：ログイン / 商品の登録・編集・削除 / 画像のアップロード・差し替え・削除・並べ替え / 公開・非公開 / AI 紹介文生成 / 問い合わせ確認

## 構成

| 役割 | 使用サービス |
| --- | --- |
| 画面・サーバー | Next.js 14（App Router）を Netlify で公開 |
| 商品・問い合わせの保存 | Firebase Firestore |
| 画像の保存 | Cloudflare R2（アップロード・削除はサーバー経由） |
| 管理者ログイン | Firebase Authentication（メール / パスワード） |
| AI 紹介文 | Claude API（`/api/ai/describe` からサーバー側で呼び出し） |

管理者の制限は「画面」だけでなく、Firestore のセキュリティルールと、画像・AI 用 API でのトークン検証により**サーバー側でも**かけています。R2 のキーと Claude の API キーはサーバー側だけに置き、ブラウザには出しません。
`admins/{UID}` ドキュメントがあるアカウントだけが管理者です。

## 別途設定・利用料金が必要な外部サービス

| サービス | 必要な設定 | 料金の目安 |
| --- | --- | --- |
| Firebase | プロジェクト作成（Firestore・Authentication のみ使用） | 無料の Spark プランで運用可能 |
| Cloudflare R2 | バケット作成・API トークン発行（有効化時に支払い方法の登録が必要） | 保存 10GB まで無料・転送料は常に無料 |
| Netlify | サイト作成・環境変数の登録 | 無料プランで運用可能 |
| Claude API（Anthropic） | API キーの発行・支払い設定 | 従量課金。画像4枚＋紹介文1回でおおむね数円〜10円程度 |
| 独自ドメイン（任意） | 取得・DNS 設定 | 年間費用 |

## 1. Firebase の準備

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** → ログイン方法 →「メール / パスワード」を有効化
3. **Firestore Database** → データベースを作成（本番モード・ロケーションは `asia-northeast1` 推奨）
4. プロジェクトの設定 → マイアプリ →「ウェブアプリを追加」→ 表示される設定値を控える

### 管理者の初期設定

1. Authentication → ユーザー →「ユーザーを追加」で管理者のメールアドレスとパスワードを登録
2. 追加したユーザーの **ユーザー UID** をコピー
3. Firestore → コレクションを開始 → コレクション ID `admins`、ドキュメント ID に **UID を貼り付け**、フィールドは `role`（文字列）= `owner` など任意で1つ作成

管理者を外すときは、このドキュメントを削除します。

### セキュリティルールの反映（PowerShell）

```powershell
npm install -g firebase-tools
firebase login
cd avere
firebase use --add          # 作成したプロジェクトを選択
firebase deploy --only firestore:rules
```

## 1-2. Cloudflare R2 の準備（画像の保存先）

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) → R2 → 利用開始（初回のみ支払い方法の登録）
2. バケットを作成（PowerShell でも可）

   ```powershell
   npx wrangler login
   npx wrangler r2 bucket create avere-images --location apac
   npx wrangler r2 bucket dev-url enable avere-images   # 表示される https://pub-xxxx.r2.dev が R2_PUBLIC_URL
   ```

3. R2 →「API トークンを管理」→「API トークンを作成」
   - 権限：**オブジェクト読み取りと書き込み**、対象バケット：`avere-images`
   - 表示される **アクセスキー ID** と **シークレットアクセスキー** を控える（シークレットは一度しか表示されません）
4. R2 の概要ページ右側の **アカウント ID** を控える

## 2. ローカルで起動（PowerShell）

```powershell
cd avere
Copy-Item .env.local.example .env.local   # 中身を Firebase の設定値と API キーで埋める
npm install
npm run dev
```

- 公開サイト：http://localhost:3000
- 管理画面：http://localhost:3000/admin/login

## 3. AI サービスの設定

1. [Claude Console](https://console.anthropic.com/) で API キーを発行し、支払い方法を登録
2. `.env.local`（ローカル）と Netlify の環境変数に `ANTHROPIC_API_KEY` を登録

API キーはサーバー側（`/api/ai/describe`）だけで使われ、ブラウザには送られません。`NEXT_PUBLIC_` を付けないでください。
使用モデルは既定で `claude-sonnet-5-5`。変更する場合は `ANTHROPIC_MODEL` を設定します。

## 4. Netlify で公開

1. このフォルダを GitHub のリポジトリにプッシュ
2. Netlify →「Add new site」→「Import an existing project」→ リポジトリを選択（ビルド設定は `netlify.toml` から自動で読み込まれます）
3. Site configuration → Environment variables に `.env.local.example` の項目をすべて登録
4. デプロイ後、Firebase → Authentication → 設定 → **承認済みドメイン** に Netlify の URL（`xxxx.netlify.app` や独自ドメイン）を追加
5. `NEXT_PUBLIC_SITE_URL` に公開 URL を設定して再デプロイ

## 5. 商品の登録方法

1. `/admin/login` からログイン →「コインを新規登録」
2. **画像**を追加（最大4枚・JPG / PNG / WebP・15MB まで。自動で長辺 2000px の JPEG に縮小して R2 に保存）。← → で並べ替え、先頭が一覧の代表画像になります
3. **名称・価格**（必須）と、**補足情報**（発行国・年代・額面・素材・鑑定会社・グレード）を入力
4. 「**AIで紹介文を生成**」→ ①概要 ②歴史と背景 ③意匠の魅力 ④コレクションとしての魅力 の下書きが入ります
5. 「**要確認**」欄（管理者のみ表示）を見ながら本文を確認・修正
6. 掲載状態を「公開する」にして保存 → 1分ほどで公開サイトに反映されます

再生成するときに、入力済み・編集済みの文章があれば上書き前に確認が出ます。AI が自動で公開することはありません。
表示例として登録する商品は「見本（サンプル）商品として表示する」にチェックすると、公開サイトに「見本」と表示されます。不要になったら削除してください。

## 6. 公開前に必ず差し替える箇所

- `src/app/legal/page.tsx`：特定商取引法に基づく表記（[ ] の箇所。古物商許可番号など）
- `src/app/privacy/page.tsx`：プライバシーポリシー（ひな形）

## 仕様上の注意・未実装の項目

- **問い合わせのメール通知は未実装**です（仕様どおり管理画面で確認）。サイドメニューに未対応件数が表示されます
- 管理画面での変更は、公開サイトに**最大1分ほど遅れて**反映されます（表示を速くするためのキャッシュ）
- スパム対策は「隠し入力欄」「表示から3秒未満の送信の破棄」「ルールでの入力検証・公開中の商品以外への送信拒否」です。送信回数の制限はないため、スパムが増えた場合は Firebase App Check（reCAPTCHA）の追加を推奨します
- 編集中にブラウザを閉じると、保存前にアップロードした画像が R2 に残る場合があります（表示には影響しません）
- r2.dev の公開 URL はお試し用で速度制限があります。本番では独自ドメイン（例：`img.example.com`）を R2 に接続し、`R2_PUBLIC_URL` を差し替えてください
- 検索・お気に入り・決済・複数管理者の権限区分は含みません

## 完成確認チェックリスト

- [ ] 商品の登録・編集・削除ができ、再読み込み・別端末でも反映される
- [ ] 画像4枚の登録・並べ替え・差し替え・削除、詳細ページでの切り替え・拡大
- [ ] 公開 / 非公開の切り替えが公開サイトに反映される（非公開の商品 URL は 404）
- [ ] AI 紹介文の生成・編集・再生成（上書き確認）・「要確認」の表示
- [ ] 問い合わせの送信と、管理画面での確認・対応状況の変更
- [ ] ログアウト状態や管理者以外のアカウントで `/admin` に入れない

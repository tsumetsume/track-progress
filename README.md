# プログレストラッキングアプリ

学習進捗を管理・共有するためのWebアプリケーションです。

## 開発環境の構築方法

### 前提条件
- Docker
- Docker Compose

### セットアップ手順

1. リポジトリをクローン
```bash
git clone [リポジトリURL]
cd project
```

2. Dockerコンテナのビルドと依存関係のインストール
```bash
docker compose build   
docker compose --rm app npm install
```

3. 環境変数の設定
プロジェクトルートに`.env`ファイルを作成し、以下の環境変数を設定します：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. 開発サーバーを起動
```bash
docker compose --rm app npm run dev
```

5. ブラウザで以下にアクセス
```
http://localhost:5173
```

## デプロイ方法

### Vercel を使用する場合

1. Vercelにログインし、新しいプロジェクトを作成
2. GitHubリポジトリをインポート
3. 環境変数を設定：
   - `VITE_SUPABASE_URL`: SupabaseプロジェクトのURL
   - `VITE_SUPABASE_ANON_KEY`: Supabaseのanon publicキー
4. デプロイを実行

### ビルド

本番環境用のビルドを作成する場合：
```bash
npm run build
```

ビルドされたファイルは`dist`ディレクトリに出力されます。

## Supabase プロジェクトの作成手順

1. [Supabase](https://supabase.com/)にアクセスし、アカウントを作成/ログイン

2. 新しいプロジェクトを作成
   - 「New Project」をクリック
   - プロジェクト名とデータベースのパスワードを設定
   - リージョンを選択（ユーザーに近い地域を推奨）
   - 「Create new project」をクリック

3. データベースの設定
   - 左メニューから「Table Editor」を選択
   - 必要なテーブルを作成（マイグレーションファイルが`supabase/migrations/`にあります）

4. APIキーを取得
   - 左メニューから「Project Settings」→「API」を選択
   - `Project URL`と`Project API keys`の`anon`と`public`の値を控える
   - これらの値をアプリの環境変数に設定

## 開発に貢献する

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE) の下で公開されています。

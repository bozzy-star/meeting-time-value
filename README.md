# Meeting TimeValue 〜 会議の値段、見えてますか?

[Meeting TimeValue Pro (MTVPRO)](https://github.com/bozzy-star/MTVPRO) のパイロット版。
人数 × 時給 × 経過時間 で「いま会議で燃えているお金」をリアルタイム表示するシングルページLP。

## 環境変数 (`.env.example` 参照)

- `NEXT_PUBLIC_MTVPRO_URL` ... フッター/結果ページCTAのリンク先
- `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` ... Cloudflare Web Analytics トークン (未設定時はビーコン読込なし)

## 開発

```bash
npm install
npm run dev   # http://localhost:3100
npm run build
```

ルート:

- `/` ... 入力フォーム → 計測 → 結果ビュー (シングルページ内ステート切替)
- `/api/og?amount=45000&duration=2700&headcount=8` ... OGP動的画像 (1200×630, PNG)

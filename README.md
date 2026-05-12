# 会議の値段 (Meeting Cost Counter)

人数 × 時給 × 経過時間 で「いま会議で燃えているお金」をリアルタイム表示するシングルページLP。

## 開発

```bash
npm install
npm run dev   # http://localhost:3100
npm run build
```

ルート:

- `/` ... 入力フォーム → 計測 → 結果ビュー (シングルページ内ステート切替)
- `/api/og?amount=45000&duration=2700&headcount=8` ... OGP動的画像 (1200×630, PNG)

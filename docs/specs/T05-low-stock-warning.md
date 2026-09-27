# T05 在庫僅少アラート / Low-stock warning

| 項目 / Item | 値 / Value |
|---|---|
| リスク区分 / Risk tier | Medium (D-09 §7) |
| 関連機能 / Related features | F1, F2 |

> リスク区分と自律レベルはプラットフォームが決める。この表は人のための参考情報。
> The platform decides the risk tier and the autonomy level. This table is for people.

## 目的 / Purpose

商品ごとに在庫の下限（しきい値）を設定し、在庫がしきい値以下になった商品を在庫一覧で目立たせる。欠品の前に入荷を手配できるようにする。
Each product has a stock threshold. The inventory list highlights products whose stock is at or below the threshold, so staff can order goods before stock runs out.

## 現状 / Current behaviour

- 在庫一覧（`GET /api/inventory`、画面 `/inventory`）は商品ごとの在庫数を表示する。在庫 0 の行だけが強調される。
  The inventory list (`GET /api/inventory`, screen `/inventory`) shows the quantity per product. Only rows with quantity 0 are highlighted.
- しきい値の項目はない。/ There is no threshold field.

## 受入基準 / Acceptance criteria

- AC1: 商品に項目 `lowStockThreshold`（0 以上の整数）を追加する。既存の商品と新しい商品の既定値は 10。
  Products get a field `lowStockThreshold` (an integer, 0 or more). Existing and new products get the default value 10.
- AC2: 商品の登録・編集 API（`POST /api/products`、`PATCH /api/products/:id`）と画面でしきい値を設定できる。負の数・小数は HTTP 400。
  The product create and edit API (`POST /api/products`, `PATCH /api/products/:id`) and screens can set the threshold. A negative number or a decimal returns HTTP 400.
- AC3: `GET /api/inventory` と `GET /api/inventory/:productId` は各商品に `lowStockThreshold` と `lowStock`（真偽値）を返す。`lowStock` は「在庫数 ≤ しきい値」のとき `true`。
  `GET /api/inventory` and `GET /api/inventory/:productId` return `lowStockThreshold` and `lowStock` (a boolean) for each product. `lowStock` is `true` when quantity ≤ threshold.
- AC4: しきい値 0 の商品は、在庫 0 のときだけ `lowStock` が `true` になる。
  For a product with threshold 0, `lowStock` is `true` only when the quantity is 0.
- AC5: 在庫一覧画面は `lowStock` の行に「在庫僅少」の表示を出す。在庫 0 の強調は今のまま。
  The inventory list screen marks rows with `lowStock` as 「在庫僅少」. The highlight for quantity 0 stays as it is.
- AC6: スキーマ変更は新しいマイグレーションで行う。
  The schema changes through a new migration.
- AC7: テストで境界値（しきい値と同じ在庫、しきい値 +1、しきい値 0）とマイグレーション後の既定値を確認する。
  Tests check the edge values (quantity equal to the threshold, threshold + 1, threshold 0) and the default after the migration.

## 前提 / Assumptions

- A1: 既定値 10 は本サンプル用の仮定。/ The default 10 is an assumption for this sample.

## 対象外 / Out of scope

- メール・通知での警告 / Warnings by email or other notifications
- 自動発注 / Automatic purchase orders
- 複数倉庫（T09） / Multiple warehouses (T09)

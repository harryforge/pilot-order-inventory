# T07 受注キャンセルと在庫戻し / Cancel an order and return stock

| 項目 / Item | 値 / Value |
|---|---|
| リスク区分 / Risk tier | Medium (D-09 §7) |
| 関連機能 / Related features | F2, F4 |

> リスク区分と自律レベルはプラットフォームが決める。この表は人のための参考情報。
> The platform decides the risk tier and the autonomy level. This table is for people.

## 目的 / Purpose

出荷前の受注をキャンセルし、引き当てた在庫を戻せるようにする。
Staff can cancel an order that is not shipped yet. The stock taken by the order goes back.

## 現状 / Current behaviour

- 受注作成時に1つのトランザクションで在庫を引き当てる（在庫行を商品 ID 順にロック）。
  Creating an order deducts the stock in one transaction (stock rows are locked in product id order).
- ステータスは 受付 → 出荷済 のみ。許可される変更は `apps/api/src/orders/order-status.ts` に定義されている。それ以外の変更は HTTP 409 `INVALID_STATUS_TRANSITION`。
  The only status change is 受付 → 出荷済. The allowed changes are defined in `apps/api/src/orders/order-status.ts`. Any other change returns HTTP 409 `INVALID_STATUS_TRANSITION`.
- 在庫移動の理由は `goods_in`、`goods_out`、`order`。/ Stock movement reasons are `goods_in`, `goods_out` and `order`.

## 受入基準 / Acceptance criteria

- AC1: 新しいステータス `キャンセル` を追加する。許可される変更は 受付 → キャンセル のみ。キャンセルからは変更できない。
  Add the status `キャンセル` (cancelled). The only allowed change is 受付 → キャンセル. A cancelled order cannot change again.
- AC2: `POST /api/orders/:id/cancel` を追加する。成功時は更新後の受注を返し、キャンセル日時 `cancelledAt` を記録する。
  Add `POST /api/orders/:id/cancel`. On success it returns the updated order and records the cancel time `cancelledAt`.
- AC3: キャンセルは1つのトランザクションで行う：ステータス変更、全明細の在庫を戻す、明細ごとに在庫移動（`in`、理由 `order_cancel`）を記録する。途中で失敗したら何も保存しない。
  A cancel runs in one transaction: change the status, return the stock of every line, and write one stock movement per line (`in`, reason `order_cancel`). If any step fails, nothing is saved.
- AC4: 在庫行のロック順序は受注作成と同じ（商品 ID 順）にする。
  Stock rows are locked in the same order as when an order is created (product id order).
- AC5: 出荷済・キャンセル済の受注は HTTP 409 `INVALID_STATUS_TRANSITION`、存在しない受注は HTTP 404。
  An order that is shipped or already cancelled returns HTTP 409 `INVALID_STATUS_TRANSITION`. An unknown order returns HTTP 404.
- AC6: 同じ受注への同時キャンセルは、1件だけ成功し、在庫は1回だけ戻る。もう1件は HTTP 409。
  When two requests cancel the same order at the same time, only one succeeds and the stock goes back once. The other returns HTTP 409.
- AC7: 受注詳細画面に「キャンセル」ボタン（受付のときだけ表示、確認ダイアログあり）を追加する。受注一覧・詳細でキャンセルのステータスを表示する。
  The order detail screen has a 「キャンセル」 button (shown only for 受付, with a confirm dialog). The order list and detail show the cancelled status.
- AC8: 統合テスト（PostgreSQL）で AC3〜AC6 を確認する。失敗時のロールバックは、テスト用モジュールで依存を差し替えて確認する。
  Integration tests (PostgreSQL) check AC3 to AC6. The rollback on failure is tested by replacing a dependency through the testing module.
- AC9: スキーマ変更（ステータスと理由のチェック制約、`cancelled_at`）は新しいマイグレーションで行う。
  The schema changes (the status and reason check constraints, `cancelled_at`) go through a new migration.

## 対象外 / Out of scope

- 出荷済の受注の返品 / Returns of shipped orders
- 一部の明細だけのキャンセル / Cancelling only some lines
- キャンセル理由の入力 / Entering a cancel reason

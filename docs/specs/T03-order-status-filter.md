# T03 受注ステータスで絞り込み / Filter orders by status

| 項目 / Item | 値 / Value |
|---|---|
| リスク区分 / Risk tier | Low (D-09 §7) |
| 関連機能 / Related features | F4, F5 |

> リスク区分と自律レベルはプラットフォームが決める。この表は人のための参考情報。
> The platform decides the risk tier and the autonomy level. This table is for people.

## 目的 / Purpose

受注一覧をステータス（受付 / 出荷済）で絞り込めるようにし、出荷待ちの受注をすぐ見つけられるようにする。
Filter the order list by status (受付 / 出荷済), so that staff can quickly find the orders that still need shipping.

## 現状 / Current behaviour

- `GET /api/orders` は `orderNumber`（受注番号の一部）と `customer`（顧客名の一部）で検索できる。
  `GET /api/orders` searches by `orderNumber` (part of the order number) and `customer` (part of the customer name).
- 受注一覧画面は検索条件を URL（`/orders?orderNumber=&customer=`）に保持する。
  The order list screen keeps the search in the URL (`/orders?orderNumber=&customer=`).
- ステータスの値は `apps/api/src/orders/order-status.ts` に定義されている。
  The status values are defined in `apps/api/src/orders/order-status.ts`.

## 受入基準 / Acceptance criteria

- AC1: `GET /api/orders` に任意のパラメータ `status` を追加する。値は `受付` または `出荷済` のみ。
  `GET /api/orders` accepts an optional parameter `status`. The only values are `受付` and `出荷済`.
- AC2: `status` を指定すると、そのステータスの受注だけを返す。指定しない場合は今と同じく全件を返す。
  With `status`, the api returns only orders with that status. Without it, the api returns all orders, as today.
- AC3: `status` は `orderNumber`、`customer` と組み合わせられる（すべての条件を満たす受注を返す）。
  `status` works together with `orderNumber` and `customer` (the api returns orders that match every filter).
- AC4: それ以外の値（例 `shipped`）は HTTP 400 で拒否する。
  Any other value (for example `shipped`) is refused with HTTP 400.
- AC5: 受注一覧画面に「ステータス」の選択欄（すべて / 受付 / 出荷済）を追加し、選択を URL の `status` に保持する。
  The order list screen has a status select (all / 受付 / 出荷済). The choice is kept in the URL as `status`.
- AC6: API のテストで AC2〜AC4 を、画面のテストで AC5 を確認する。
  API tests check AC2 to AC4. A screen test checks AC5.

## 対象外 / Out of scope

- 新しいステータスの追加（キャンセルは T07） / New statuses (cancellation is T07)
- 並べ替え・ページング（ページングは T08） / Sorting or paging (paging is T08)

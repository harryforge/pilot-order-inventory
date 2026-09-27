# T08 受注一覧のページング / Pagination for the order API and list screen

| 項目 / Item | 値 / Value |
|---|---|
| リスク区分 / Risk tier | Medium (D-09 §7) |
| 関連機能 / Related features | F5 |

> リスク区分と自律レベルはプラットフォームが決める。この表は人のための参考情報。
> The platform decides the risk tier and the autonomy level. This table is for people.

## 目的 / Purpose

受注が増えても一覧を速く表示できるよう、受注一覧 API と画面をページ単位にする。
Split the order list API and screen into pages, so the list stays fast when the number of orders grows.

## 現状 / Current behaviour

- `GET /api/orders` は条件に合う全受注を配列で返す（受注日時の新しい順）。ページングはない。
  `GET /api/orders` returns every matching order as an array (newest order date first). There is no paging.
- 画面は検索条件を URL に保持する。/ The screen keeps the search in the URL.

## 受入基準 / Acceptance criteria

- AC1: `GET /api/orders` にパラメータ `page`（1 以上、既定 1）と `pageSize`（1〜100、既定 20）を追加する。範囲外・整数以外は HTTP 400。
  `GET /api/orders` accepts `page` (1 or more, default 1) and `pageSize` (1 to 100, default 20). A value out of range or not an integer returns HTTP 400.
- AC2: 応答を `{ "items": [...], "total": <件数>, "page": <番号>, "pageSize": <件数> }` に変える。`total` は検索条件に合う全件数。
  The response becomes `{ "items": [...], "total": <count>, "page": <number>, "pageSize": <count> }`. `total` counts every order that matches the search.
- AC3: これは API の互換性のない変更である。同じリポジトリ内の利用箇所（web アプリ）をすべて合わせて変更する。
  This is a breaking API change. Update every caller in this repo (the web app) in the same change.
- AC4: 並び順は受注日時の新しい順、同じ日時なら ID の大きい順とし、ページをまたいで重複・欠落がない。
  The order is newest order date first, then the higher id first for the same date, so no order appears twice or is skipped across pages.
- AC5: 最後のページより後の `page` は、空の `items` と正しい `total` を返す（エラーにしない）。
  A `page` after the last page returns empty `items` and the correct `total` (not an error).
- AC6: 検索条件（`orderNumber`、`customer`）とページングを組み合わせられる。検索条件を変えたら1ページ目に戻る。
  Paging works together with the search (`orderNumber`, `customer`). Changing the search goes back to page 1.
- AC7: 受注一覧画面に「前へ / 次へ」とページ番号・全件数を表示し、`page` を URL に保持する。
  The order list screen shows 「前へ / 次へ」 (previous / next), the page number and the total count, and keeps `page` in the URL.
- AC8: テストで既定値、境界値（`pageSize` 1 と 100、101）、最後のページ、同じ日時の並び順を確認する。
  Tests check the defaults, the edge values (`pageSize` 1, 100 and 101), the last page, and the order of rows with the same date.

## 対象外 / Out of scope

- 他の一覧（商品・在庫・顧客）のページング / Paging for other lists (products, inventory, customers)
- 並び順の変更機能 / Choosing the sort order
- カーソル方式のページング / Cursor-based paging

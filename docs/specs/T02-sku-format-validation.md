# T02 SKU 形式チェック / Validate the SKU format

| 項目 / Item | 値 / Value |
|---|---|
| リスク区分 / Risk tier | Low (D-09 §7) |
| 関連機能 / Related features | F1 |

> リスク区分と自律レベルはプラットフォームが決める。この表は人のための参考情報。
> The platform decides the risk tier and the autonomy level. This table is for people.

## 目的 / Purpose

商品登録・編集時に SKU の形式をチェックし、形式の違う SKU を登録できないようにする。
Check the SKU format when a product is created or edited, so that a SKU with a wrong format cannot be saved.

## 現状 / Current behaviour

- SKU は必須、前後の空白を除去、最大 64 文字、一意であることだけをチェックしている。
  The api only checks that the SKU is present, trims spaces, allows at most 64 characters, and keeps it unique.
- サンプルデータの SKU は `TEA-001`、`RCE-012` のような形式。
  The sample data uses SKUs such as `TEA-001` and `RCE-012`.

## 受入基準 / Acceptance criteria

- AC1: SKU の形式は「英大文字3文字、ハイフン、数字3桁」とする（正規表現 `^[A-Z]{3}-[0-9]{3}$`）。
  The SKU format is three capital letters, a hyphen and three digits (regular expression `^[A-Z]{3}-[0-9]{3}$`).
- AC2: `POST /api/products` と `PATCH /api/products/:id` は、形式の違う SKU を HTTP 400 で拒否する。
  メッセージに期待する形式（例 `ABC-123`）を含める。前後の空白は今と同じく除去してからチェックする。
  `POST /api/products` and `PATCH /api/products/:id` refuse a SKU with a wrong format with HTTP 400.
  The message names the expected format (example `ABC-123`). Spaces at both ends are trimmed before the check, as today.
- AC3: 小文字（例 `tea-001`）は自動で大文字に変換せず、拒否する。
  Lower-case letters (for example `tea-001`) are refused, not converted to capitals.
- AC4: 商品登録・編集画面は、API のエラーメッセージを SKU 欄の近くに表示する。
  The create and edit screens show the API error message next to the SKU field.
- AC5: 正しい例（`TEA-001`）と誤った例（`TEA-1`、`tea-001`、`TEAS-001`、`TEA_001`、空文字）を単体テストで確認する。
  Unit tests check a valid SKU (`TEA-001`) and invalid SKUs (`TEA-1`, `tea-001`, `TEAS-001`, `TEA_001`, an empty string).
- AC6: サンプルデータ（`pnpm db:seed`）は変更なしで読み込める。
  The sample data (`pnpm db:seed`) still loads without changes.

## 対象外 / Out of scope

- データベースの既存データの変換・チェック制約の追加 / Converting existing data, or a database check constraint
- SKU の自動採番 / Generating SKUs automatically

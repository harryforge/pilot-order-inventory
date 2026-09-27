# T04 受注一覧の CSV 出力 / Export the order list to CSV

| 項目 / Item | 値 / Value |
|---|---|
| リスク区分 / Risk tier | Medium (D-09 §7) |
| 関連機能 / Related features | F5 |

> リスク区分と自律レベルはプラットフォームが決める。この表は人のための参考情報。
> The platform decides the risk tier and the autonomy level. This table is for people.

## 目的 / Purpose

受注一覧を CSV ファイルで出力し、表計算ソフトで開けるようにする。日本の取引先向けに Shift_JIS も選べるようにする。
Export the order list as a CSV file that opens in a spreadsheet program. Staff can choose Shift_JIS for Japanese business partners.

## 現状 / Current behaviour

- 受注一覧（`GET /api/orders`、画面 `/orders`）は受注番号と顧客名で検索できる。CSV 出力はない。
  The order list (`GET /api/orders`, screen `/orders`) searches by order number and customer name. There is no CSV export.

## 受入基準 / Acceptance criteria

- AC1: `GET /api/orders/export` を追加する。受注一覧と同じ検索パラメータ（`orderNumber`、`customer`）を受け付け、同じ受注を同じ順序（受注日時の新しい順）で出力する。
  Add `GET /api/orders/export`. It accepts the same search parameters as the order list (`orderNumber`, `customer`) and exports the same orders in the same order (newest order date first).
- AC2: パラメータ `encoding` は `utf-8`（既定）または `shift_jis`。それ以外は HTTP 400。
  The parameter `encoding` is `utf-8` (default) or `shift_jis`. Any other value returns HTTP 400.
- AC3: 列は次の順序とし、1行目は日本語の見出し行とする。
  The columns are in this order. The first row is a header row in Japanese.

  | 見出し / Header | 内容 / Content |
  |---|---|
  | 受注番号 | Order number, for example `SO-000123` |
  | 受注日時 | Order date and time, `YYYY-MM-DD HH:mm` |
  | 顧客名 | Customer name |
  | ステータス | 受付 or 出荷済 |
  | 合計金額 | Order total in whole yen, digits only (no `¥`, no separators) |
  | 出荷日時 | Shipping date and time, `YYYY-MM-DD HH:mm`, empty when not shipped |

- AC4: 形式は RFC 4180 に従う。区切りはカンマ、改行は CRLF。カンマ・ダブルクォート・改行を含む値はダブルクォートで囲み、ダブルクォートは2つ重ねる。
  The format follows RFC 4180: comma separators and CRLF line ends. A value with a comma, a double quote or a line break is put in double quotes, and a double quote inside is doubled.
- AC5: 応答ヘッダー：`Content-Type: text/csv; charset=UTF-8` または `charset=Shift_JIS`、`Content-Disposition: attachment; filename="orders-YYYYMMDD.csv"`（出力した日付）。
  Response headers: `Content-Type: text/csv; charset=UTF-8` or `charset=Shift_JIS`, and `Content-Disposition: attachment; filename="orders-YYYYMMDD.csv"` (the export date).
- AC6: 受注一覧画面に「CSV 出力」ボタンと文字コードの選択（UTF-8 / Shift_JIS）を追加する。今の検索条件で出力する。
  The order list screen has a "CSV 出力" button and an encoding choice (UTF-8 / Shift_JIS). The export uses the current search.
- AC7: テストで、見出し行、エスケープ（カンマ・ダブルクォート・改行を含む顧客名）、Shift_JIS のバイト列（例 `受付`）、検索条件、AC8 を確認する。
  Tests check the header row, escaping (a customer name with a comma, a double quote and a line break), the Shift_JIS bytes (for example of `受付`), the search parameters, and AC8.
- AC8: Shift_JIS で表せない文字（例 `𠮷`、絵文字）を含む場合は、HTTP 422、コード `CSV_UNSUPPORTED_CHARACTER` で拒否し、該当する受注番号を `details` に入れる。文字を置き換えて出力しない。
  If a value has a character that Shift_JIS cannot hold (for example `𠮷` or an emoji), the api refuses with HTTP 422 and the code `CSV_UNSUPPORTED_CHARACTER`, and lists the order numbers in `details`. It never replaces the character silently.

## 前提 / Assumptions

以下は本サンプル用の仮定であり、実在の取引先の要件ではない。
These are assumptions for this sample, not requirements of a real business partner.

- A1: Shift_JIS は Windows-31J（CP932）とする。/ Shift_JIS means Windows-31J (CP932).
- A2: UTF-8 は BOM 付きとする（表計算ソフトで文字化けしないため）。/ UTF-8 files start with a BOM, so spreadsheet programs detect the encoding.
- A3: 日時は日本時間（Asia/Tokyo）で出力する。/ Dates and times are in Japan time (Asia/Tokyo).
- A4: Node.js には Shift_JIS の変換機能がないため、ライブラリの追加が必要になる可能性がある。追加する場合は計画（G3）に明記する。
  Node.js cannot encode Shift_JIS by itself, so a library may be needed. A new library must be named in the plan (G3).

## 対象外 / Out of scope

- 受注明細の出力 / Exporting order lines
- 商品・在庫・顧客の CSV 出力 / CSV export of products, inventory or customers
- CSV の取り込み / Importing CSV
- 非同期出力・件数上限（件数は約100件の想定） / Background export or a row limit (about 100 orders are expected)

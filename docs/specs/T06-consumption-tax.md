# T06 消費税計算 / Consumption tax calculation

| 項目 / Item | 値 / Value |
|---|---|
| リスク区分 / Risk tier | Medium (D-09 §7) |
| 関連機能 / Related features | F1, F4, F5 |

> リスク区分と自律レベルはプラットフォームが決める。この表は人のための参考情報。
> The platform decides the risk tier and the autonomy level. This table is for people.

> **仮定 / Assumption**
> 受入基準 AC2 の端数処理（税率ごとに合計してから計算し、1円未満切り捨て）は、本サンプル用の**仮定**であり、実際の税務ルールではない。
> 仕様のあいまいさをゲート G2 で見つけられるかを試すために置いている。実案件では税理士・顧客に確認すること。
> The rounding rule in AC2 (sum per tax rate first, then round down below 1 yen) is an **assumption** for this sample. It is not a real tax rule.
> It is here to test whether gate G2 finds an unclear spec. In a real project, confirm the rule with the client and a tax adviser.

## 目的 / Purpose

注文明細ごとに税率（10% / 8%）を適用し、注文合計の消費税額を計算する。
Apply the tax rate (10% / 8%) to each order line and calculate the order's total consumption tax.

## 現状 / Current behaviour

- 商品の価格と注文合計は税抜・円単位の整数。税の項目はない。
  Product prices and order totals are whole yen, before tax. There are no tax fields.
- 注文明細は注文時点の単価を保持する。/ An order line keeps the unit price of the moment the order was created.

## 受入基準 / Acceptance criteria

- AC1: 商品に税区分（標準 10% / 軽減 8%）を持たせる。API の値は `standard` / `reduced`。既存の商品は `standard` とする。
  Each product has a tax category (standard 10% / reduced 8%). The API values are `standard` and `reduced`. Existing products become `standard`.
- AC2: 税額は税率ごとに合計してから計算し、1円未満は切り捨てる。（**仮定**、上記参照）
  Sum amounts per tax rate first, then calculate the tax; round down fractions below 1 yen. (**Assumption**, see above.)
- AC3: 画面と API で税抜・税額・税込を表示する（注文詳細と注文一覧）。
  The screen and the API show the price before tax, the tax amount and the price including tax (order detail and order list).
- AC4: 注文明細は注文時点の税率を保持する。後で商品の税区分を変えても、既存の注文の税額は変わらない。
  An order line keeps the tax rate of the moment the order was created. A later change of the product's tax category does not change existing orders.
- AC5: 税区分導入前の注文は、マイグレーションで全明細を標準税率として税額を計算する。
  For orders created before this change, the migration treats every line as the standard rate and calculates the tax.
- AC6: テストで次の例を確認する。/ Tests check these examples.

  | 明細 / Lines | 税抜 / Before tax | 税額 / Tax | 税込 / Including tax |
  |---|---|---|---|
  | 標準 ¥1,001 | ¥1,001 | ¥100 | ¥1,101 |
  | 軽減 ¥999 | ¥999 | ¥79 | ¥1,078 |
  | 標準 ¥105 + 標準 ¥105（税率ごとに合計 → ¥210 × 10%） | ¥210 | ¥21 | ¥231 |
  | 標準 ¥1,001 + 軽減 ¥999 | ¥2,000 | ¥179 | ¥2,179 |

- AC7: スキーマ変更は新しいマイグレーションで行う。/ The schema changes through a new migration.

## 対象外 / Out of scope

- インボイス番号の出力 / Printing the invoice number
- 税込価格での商品登録 / Entering product prices including tax
- 税率の変更履歴・日付による税率の切り替え / Tax rate history or rates that change by date

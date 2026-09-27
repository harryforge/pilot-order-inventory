import type { SalesStatus } from '../products/sales-status.js';
import { SeededRandom } from './random.js';

/**
 * Fictional sample data for F6: about 50 products, 20 customers and 100 orders (D-09 §4).
 * Everything is made up: shop names are generic, every address is in the non-existent
 * "サンプル市", and every phone number uses the unused exchange 0000.
 */
export const SEED_COUNTS = { products: 50, customers: 20, orders: 100 } as const;
export const DEFAULT_SEED = 20260927;
const ORDER_PERIOD_DAYS = 180;
const SHIPPED_SHARE = 0.6;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SeedProduct {
  sku: string;
  name: string;
  price: number;
  salesStatus: SalesStatus;
  openingStock: number;
}

export interface SeedCustomer {
  name: string;
  address: string;
  phone: string;
}

export interface SeedOrder {
  /** Index into `customers`. */
  customer: number;
  /** Index into `products`, one entry per product. */
  lines: { product: number; quantity: number }[];
  orderedAt: Date;
  /** Set for orders that are already 出荷済. */
  shippedAt: Date | null;
}

export interface SeedData {
  openingStockAt: Date;
  products: SeedProduct[];
  customers: SeedCustomer[];
  orders: SeedOrder[];
}

/** Base items: SKU prefix, name and price for the small size. Each has two sizes. */
const ITEMS: readonly [prefix: string, name: string, price: number][] = [
  ['TEA', '煎茶', 680],
  ['TEA', 'ほうじ茶', 540],
  ['TEA', '玄米茶', 480],
  ['TEA', '麦茶ティーバッグ', 320],
  ['RCE', '白米', 1980],
  ['RCE', '玄米', 2280],
  ['NDL', '乾麺 うどん', 260],
  ['NDL', '乾麺 そば', 300],
  ['SEA', '濃口醤油', 380],
  ['SEA', '米味噌', 460],
  ['SEA', '米酢', 290],
  ['SEA', 'みりん', 420],
  ['SNK', '醤油せんべい', 240],
  ['SNK', '抹茶クッキー', 520],
  ['SNK', 'いもけんぴ', 350],
  ['DRY', '昆布', 640],
  ['DRY', 'かつお節', 720],
  ['DRY', '干ししいたけ', 880],
  ['HOM', '食器用洗剤', 260],
  ['HOM', 'キッチンペーパー', 330],
  ['HOM', 'ふきん', 440],
  ['HOM', '保存容器', 780],
  ['BEV', '緑茶ペットボトル', 150],
  ['BEV', '炭酸水', 120],
  ['BEV', '缶コーヒー', 130],
];
const SIZES: readonly [label: string, factor: number][] = [
  ['小', 1],
  ['大', 2.5],
];
/** Product numbers that are no longer sold, so the lists show both sales statuses. */
const DISCONTINUED_NUMBERS = new Set([14, 29, 47]);

const SHOP_PREFIXES = ['さくら', 'みどり', 'あおば', 'ひかり', 'こだま', 'つばさ', 'はるか', 'ゆうひ', 'かえで', 'すずらん'];
const SHOP_TYPES = ['商店', 'マート'];
const PREFECTURES = ['東京都', '大阪府', '愛知県', '福岡県', '北海道', '宮城県', '広島県', '京都府'];
const TOWNS = ['本町', '中央', '栄町', '緑町', '港町', '桜台'];
const AREA_CODES = ['03', '06', '052', '092', '011', '022', '082', '075'];

function roundTo10(yen: number): number {
  return Math.round(yen / 10) * 10;
}

function products(random: SeededRandom): SeedProduct[] {
  return ITEMS.flatMap(([prefix, name, price], itemIndex) =>
    SIZES.map(([size, factor], sizeIndex) => {
      const number = itemIndex * SIZES.length + sizeIndex + 1;
      const sku = `${prefix}-${String(number).padStart(3, '0')}`;
      // A few products start with little stock, so the stock screen shows some low numbers.
      const openingStock = number % 9 === 0 ? random.int(8, 15) : random.int(60, 200);
      return {
        sku,
        name: `${name}（${size}）`,
        price: roundTo10(price * factor),
        salesStatus: DISCONTINUED_NUMBERS.has(number) ? 'discontinued' : 'on_sale',
        openingStock,
      } satisfies SeedProduct;
    }),
  );
}

function customers(): SeedCustomer[] {
  return Array.from({ length: SEED_COUNTS.customers }, (_, i) => {
    const prefecture = i % PREFECTURES.length;
    return {
      name: `${SHOP_PREFIXES[i % SHOP_PREFIXES.length]}${SHOP_TYPES[Math.floor(i / SHOP_PREFIXES.length)]}`,
      address: `${PREFECTURES[prefecture]}サンプル市${TOWNS[i % TOWNS.length]}${(i % 5) + 1}-${(i % 7) + 1}-${i + 1}`,
      phone: `${AREA_CODES[prefecture]}-0000-${String(i + 1).padStart(4, '0')}`,
    };
  });
}

function orders(
  random: SeededRandom,
  catalog: readonly SeedProduct[],
  now: Date,
): SeedOrder[] {
  const stock = catalog.map((product) => product.openingStock);
  const orderable = catalog
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => product.salesStatus === 'on_sale')
    .map(({ index }) => index);
  const start = now.getTime() - ORDER_PERIOD_DAYS * DAY_MS;
  const step = (ORDER_PERIOD_DAYS * DAY_MS) / SEED_COUNTS.orders;

  return Array.from({ length: SEED_COUNTS.orders }, (_, i) => {
    const orderedAt = new Date(start + i * step + random.int(0, Math.floor(step / 2)));
    const lines = new Map<number, number>();
    const wanted = random.int(1, 4);
    for (let attempt = 0; lines.size < wanted && attempt < 20; attempt += 1) {
      const product = random.pick(orderable);
      const quantity = random.int(1, 5);
      // Never plan more than the stock left, so every seeded order can be created.
      if (!lines.has(product) && stock[product] >= quantity) {
        lines.set(product, quantity);
        stock[product] -= quantity;
      }
    }
    if (lines.size === 0) {
      // Every order needs a line: fall back to the product with the most stock left.
      const fallback = orderable.reduce((best, index) => (stock[index] > stock[best] ? index : best));
      if (stock[fallback] === 0) {
        throw new Error('Seed data ran out of stock; raise the opening stock');
      }
      lines.set(fallback, 1);
      stock[fallback] -= 1;
    }
    // Older orders are shipped; the most recent ones are still 受付.
    const shipped = i < SEED_COUNTS.orders * SHIPPED_SHARE;
    return {
      customer: random.int(0, SEED_COUNTS.customers - 1),
      lines: [...lines].map(([product, quantity]) => ({ product, quantity })),
      orderedAt,
      shippedAt: shipped ? new Date(orderedAt.getTime() + random.int(1, 3) * DAY_MS) : null,
    };
  });
}

/** Builds the sample data. The same seed and `now` always give the same data. */
export function generateSeedData(now: Date = new Date(), seed = DEFAULT_SEED): SeedData {
  const random = new SeededRandom(seed);
  const catalog = products(random);
  return {
    openingStockAt: new Date(now.getTime() - (ORDER_PERIOD_DAYS + 1) * DAY_MS),
    products: catalog,
    customers: customers(),
    orders: orders(random, catalog, now),
  };
}

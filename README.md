# pilot-order-inventory

A **fictional** order intake and inventory system (受注・在庫管理) for a small retail company in Japan.
It is the sample pilot repo of the Agentic SDLC Framework: the platform runs its agents on this repo
for integration tests and demos (framework design D-09).

- All data is fake. The repo never holds real client data or real credentials.
- The database values in `docker-compose.yml` and `.env.example` are for local development only.

## Status

| Task | Scope | Status |
|---|---|---|
| R01 | Skeleton: pnpm workspace, Vue web app, NestJS api, PostgreSQL, sample tests | Done |
| R02 | Features F1–F6: products, inventory, customers, orders, order list, sample data | In progress: F1–F3 done (PR A); F4–F6 next (PR B) |
| R03 | CI, security scans, branch protection, CODEOWNERS, PR template | Planned |
| R04 | Specs T01–T10 in `docs/specs/`, `AGENTS.md` | Planned |

## Stack

| Layer | Technology |
|---|---|
| Frontend (`apps/web`) | Vue 3, Vite, TypeScript |
| Backend (`apps/api`) | NestJS 12 (ES modules), TypeScript |
| Database | PostgreSQL 18 (Docker Compose) |
| ORM | TypeORM with the `pg` driver |
| Tests | Vitest (web), Jest (api) |
| Lint | ESLint with typescript-eslint and eslint-plugin-vue |
| Package manager | pnpm 10 workspace (version pinned in `package.json`, `packageManager`) |
| Runtime | Node.js 24 |

## Layout

```text
pilot-order-inventory/
├── apps/
│   ├── web/            # Vue 3 app (Vite dev server on port 5173, proxies /api to the api)
│   └── api/            # NestJS api (port 3000, all routes under /api)
├── docs/
│   └── specs/          # Bilingual Japanese–English specs, one file per feature (R04)
├── docker-compose.yml  # PostgreSQL for local development
└── README.md
```

## Run it locally

You need Node.js 24, Docker with Docker Compose, and corepack (it comes with Node.js).

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:migrate
pnpm dev
```

Then open:

- Web app: <http://localhost:5173>. The footer shows the api and database status.
- Api health check: <http://localhost:3000/api/health>. It returns `{"status":"ok","database":"up"}`,
  or HTTP 503 with `"database":"down"` when PostgreSQL is not reachable.

Stop the database with `docker compose down`. Add `-v` to delete its data volume as well.

### Change the database settings

The api, the migration command and Docker Compose read the same variables:
`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `API_PORT`.
The defaults are in `.env.example`. To change them, copy the file to `.env` in the repo root and edit it.
For example, if port 5432 is already in use on your machine, set `POSTGRES_PORT=55432`.

## Commands

Run these in the repo root.

| Command | What it does |
|---|---|
| `pnpm dev` | Starts the api (watch mode) and the web dev server |
| `pnpm lint` | ESLint on the whole repo |
| `pnpm typecheck` | TypeScript check for both apps (`tsc`, `vue-tsc`) |
| `pnpm test` | Unit tests for both apps. They need no database |
| `pnpm test:integration` | Api integration tests against PostgreSQL (needs `docker compose up -d`) |
| `pnpm build` | Production build of both apps (`apps/*/dist`) |
| `pnpm db:migrate` | Builds the api and applies pending TypeORM migrations |

## Features

The baseline features follow D-09 §4. Screen labels are English; the order status values 受付 and
出荷済 are data values and appear as they are.

| # | Feature | Screens | Api (all under `/api`) |
|---|---|---|---|
| F1 | Products: create, edit, view, list | `/products`, `/products/new`, `/products/:id`, `/products/:id/edit` | `GET/POST /products`, `GET/PATCH /products/:id` |
| F2 | Inventory: goods in, goods out, stock, movement history (single warehouse) | `/inventory`, `/inventory/:productId` | `GET /inventory`, `GET /inventory/:productId`, `GET /inventory/:productId/movements`, `POST /inventory/goods-in`, `POST /inventory/goods-out` |
| F3 | Customers: create, view, list | `/customers`, `/customers/new`, `/customers/:id` | `GET/POST /customers`, `GET /customers/:id` |

Business rules:

- A product has a SKU (unique; only presence and length are checked), a name, a price in whole yen
  and a sales status (`on_sale` or `discontinued`). Creating a product also creates its stock record
  with quantity 0.
- Stock never goes below zero. Every change writes a stock movement (`in` or `out`, a reason, the
  quantity and the balance after it). Goods out that would go below zero is refused with HTTP 409.
- Stock changes lock the stock rows in product id order (`SELECT … FOR UPDATE`), so concurrent
  requests wait for each other instead of overselling.

Errors use the NestJS body (`statusCode`, `message`) plus a stable `code`, for example
`{"statusCode":409,"code":"INSUFFICIENT_STOCK","message":"Not enough stock","details":[{"productId":3,"requested":9,"available":2}]}`.
Invalid requests return HTTP 400 with the validation messages.

## Decisions

### ORM: TypeORM

D-09 left the choice open between Prisma and TypeORM. We chose **TypeORM** because:

- It is plain JavaScript on top of the `pg` driver. An install fetches packages from the npm registry and
  nothing else. Prisma downloads its engine binaries from its own server, which the agent sandbox
  cannot reach (the sandbox only reaches an npm package proxy).
- NestJS has an official module for it (`@nestjs/typeorm`).
- It supports migrations. The schema changes **only** through migrations: `synchronize` is off.
  Migrations live in `apps/api/src/migrations/`. Register each new migration (and each new entity)
  in `apps/api/src/database/`: the lists are classes, not file globs, so the same configuration
  works for the compiled app, the TypeORM CLI and the tests.

### Test runners: Vitest for web, Jest for api

- **Web: Vitest**, the standard runner for Vite projects.
- **Api: Jest**, as D-09 proposes and as NestJS documents. NestJS dependency injection reads the
  decorator metadata that the TypeScript compiler emits. ts-jest compiles with the TypeScript compiler,
  so the metadata is there. Vitest compiles without it and would need an extra SWC plugin.
- NestJS 12 ships ES modules only, so the api is an ES module package. Jest runs in its native
  ES module mode (`node --experimental-vm-modules`). In api tests:
  - import `describe`, `it`, `expect` and `jest` from `@jest/globals`;
  - write relative imports with the `.js` extension, as in the source code;
  - replace dependencies through the NestJS testing module (`Test.createTestingModule`), not with
    `jest.mock`, which does not work for ES modules.

### Request validation: class-validator

Request bodies are DTO classes checked by the NestJS `ValidationPipe` (`class-validator` and
`class-transformer`, the libraries NestJS documents). Unknown fields are refused. The pipe is set up
in `apps/api/src/common/configure-app.ts`, which the app and the tests share.

### Integration tests use the Compose PostgreSQL

Stock changes depend on PostgreSQL row locks and transactions, so they are tested against a real
database. `pnpm test:integration` uses a separate database, `<POSTGRES_DB>_test` (the name must end
with `_test`), on the Docker Compose PostgreSQL. Each test file drops the schema and runs every
migration, so the migrations are tested too. These tests run one file at a time (`--runInBand`).
`pnpm test` stays database-free.

### Installs use the npm registry only

`pnpm-workspace.yaml` allows no dependency install scripts (`onlyBuiltDependencies: []`). The packages
in `ignoredBuiltDependencies` ship prebuilt binaries, so their scripts are not needed. Always install
from the lockfile: `pnpm install --frozen-lockfile`.

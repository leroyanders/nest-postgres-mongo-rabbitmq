# Marketplace API

A multi-vendor **marketplace backend** built with NestJS and PostgreSQL. It covers the full commerce loop — accounts with refresh sessions, seller stores, a product catalog with variants, warehouse stock with a movement journal, carts, orders with a status state machine, wallet payments with a double-entry-style ledger — plus an asynchronous audit trail streamed to MongoDB through RabbitMQ.

Built as a practice project with production-grade patterns: atomic conditional updates for money and stock, transactional consistency across aggregates, idempotent payments, and event-driven read models.

## Table of Contents

- [Architecture](#architecture)
- [Domain Modules](#domain-modules)
- [Consistency & Integrity](#consistency--integrity)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Postman](#postman)
- [Testing](#testing)
- [Project Structure](#project-structure)

## Architecture

```
                                  HTTP (REST, /api)
                                        │
        ┌───────────────────────────────┼────────────────────────────────┐
        │                               │                                │
   Identity                         Commerce                         Catalog
   ────────                         ────────                         ───────
   accounts (JWT + sessions)        carts ──► orders ──► payments    stores
   profiles / addresses                          │           │       categories
                                     stocks ◄────┘           ▼       products / variants
                                     (reserve/sale/return)  wallets (ledger)
                                                              │
                                          "wallet.transaction.created"
                                                              │
                                                              ▼
                                       RabbitMQ ──► transactions consumer ──► MongoDB
```

- **PostgreSQL (Prisma 7)** is the system of record: identity, catalog, stock, orders, payments and the wallet ledger.
- **RabbitMQ** carries domain events emitted after commit (fire-and-forget, failures are logged and never roll back the write).
- **MongoDB (Mongoose)** stores a denormalized audit copy of the wallet ledger, populated by the RabbitMQ consumer.

## Domain Modules

Each module under `src/modules/` owns one aggregate of the database schema and follows the same layout: `controllers/`, `services/`, `dtos/`, `errors/`, `types/`.

| Module | Tables | Responsibility |
| --- | --- | --- |
| `accounts` | `accounts`, `sessions` | Sign-up (account + profile + wallet in one nested create), sign-in with account-status checks, refresh-token rotation with replay protection, sign-out |
| `profiles` | `profiles` | Buyer profile (1-to-1 with account); resolves `accountId → profileId` for the rest of the domain |
| `addresses` | `addresses` | Delivery addresses CRUD with a single default address per profile |
| `wallets` | `wallets`, `wallet_transactions` | Balance operations (deposit, withdraw, pay, refund); every operation writes a ledger row with `balanceBefore`/`balanceAfter` in the same transaction |
| `stores` | `stores` | Seller stores with slug, status lifecycle `DRAFT → ACTIVE → SUSPENDED/CLOSED`, soft delete, ownership checks |
| `categories` | `categories`, `product_categories` | Category tree with slugs and ordering |
| `products` | `products`, `product_variants` | Products with variants (SKU, prices, attributes, exactly one default variant), public catalog with filtering and rating aggregation |
| `stocks` | `stocks`, `stock_movements` | Per-variant stock; manual adjustments (`INCOME`/`CORRECTION`/`WRITE_OFF`) and order-driven operations (`RESERVE`/`RELEASE`/`SALE`/`RETURN`), every change journaled with before/after quantities |
| `carts` | `carts`, `cart_items` | One cart per (profile, store) pair with availability checks |
| `orders` | `orders`, `order_items`, `order_status_history` | Checkout (price/product/address snapshot, stock reservation, cart cleanup in one transaction) and a guarded status state machine with history |
| `payments` | `payments` | Wallet payment with idempotency key, automatic refunds on cancellation/return |
| `reviews` | `reviews` | Reviews for delivered order items, one review per product per buyer |
| `transactions` | MongoDB `transactions` | RabbitMQ consumer building the audit read model of the wallet ledger |

Supporting layers:

- `src/shared/` — auth (JWT signing/verification, guard), messaging (RabbitMQ client), event contracts;
- `src/common/` — exception filters, the `ApplicationError` base class, decorators, pagination primitives, utilities;
- `src/config/` — typed configuration validated at startup;
- `src/database/` — Prisma (PostgreSQL) and Mongoose (MongoDB) connections.

### Order lifecycle

```
PENDING ──► ACCEPTED ──► PROCESSING ──► IN_DELIVERY ──► DELIVERED ──► COMPLETED
   │            │             │                             │              │
   └────────────┴─────────────┴──► CANCELLED                └──────────────┴──► RETURNED
```

- Buyer: cancel while `PENDING`, confirm receipt (`DELIVERED → COMPLETED`).
- Seller: accept, process, ship, deliver, cancel (until shipped), accept a return.
- `CANCELLED` releases stock reservations and refunds wallet payments; `DELIVERED` converts reservations into sales; `RETURNED` restocks items and refunds.

## Consistency & Integrity

- **Money is never lost.** Wallet debits run as a single conditional `UPDATE … WHERE balance >= amount RETURNING balance` — check and debit are atomic, so concurrent requests cannot drive a balance negative. The ledger row is written in the same database transaction.
- **Stock cannot be oversold.** Reservations use `UPDATE … WHERE quantity - reservedQuantity >= q`; every mutation produces a `stock_movements` journal entry with before/after values.
- **Checkout is all-or-nothing.** Order creation, product/price/address snapshotting, stock reservation and cart deletion happen in one transaction.
- **Status transitions are guarded.** A transition map validates the target status, and an optimistic `UPDATE … WHERE status = <expected>` guard makes concurrent transitions safe. Side effects (stock, refunds) run inside the same transaction; history rows record who changed what.
- **Payments are idempotent.** An optional `idempotencyKey` (unique in the database) makes payment retries safe.
- **Events never break writes.** `wallet.transaction.created` is published after commit; a broker outage is logged, the source of truth stays consistent, and the consumer dead-letters poison messages instead of requeueing them forever.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js, TypeScript (strict) |
| Framework | NestJS 11 (HTTP + RabbitMQ microservice) |
| Primary database | PostgreSQL, Prisma ORM 7 (`@prisma/adapter-pg`) |
| Audit store | MongoDB, Mongoose |
| Messaging | RabbitMQ (`@nestjs/microservices`, amqplib) |
| Auth | JWT access tokens + hashed refresh sessions, bcrypt |
| Validation | class-validator / class-transformer |
| Testing | Jest, ts-jest |

## Getting Started

### Prerequisites

- Node.js 20+ and Yarn
- Docker (for PostgreSQL, MongoDB and RabbitMQ)

### Setup

```bash
# 1. Start infrastructure (PostgreSQL, MongoDB, RabbitMQ)
docker compose up -d

# 2. Install dependencies
yarn install

# 3. Configure environment
cp .env.example .env    # adjust values if needed

# 4. Generate the Prisma client and apply migrations
yarn prisma:generate
yarn prisma:migrate

# 5. Run the app (http://localhost:3000/api)
yarn start:dev
```

RabbitMQ management UI is available at `http://localhost:15672` (guest/guest).

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | no | `3000` | HTTP server port |
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `MONGODB_CONNECTION_STRING` | yes | — | MongoDB connection string |
| `APP_JWT_SECRET` | yes | — | JWT signing secret |
| `APP_JWT_EXPIRES_IN` | no | `1h` | Access-token TTL |
| `APP_JWT_REFRESH_EXPIRES_IN` | no | `30d` | Refresh-session TTL |
| `RABBITMQ_URL` | yes | — | RabbitMQ connection string |
| `RABBITMQ_QUEUE` | yes | — | Event queue name |

All variables are validated at startup (`src/config/env.validation.ts`) — the app refuses to boot with an incomplete configuration.

## API Reference

Base URL: `http://localhost:3000/api`. Protected endpoints expect an `Authorization: Bearer <accessToken>` header.

### Auth & Account

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/account/sign-up` | — | Register (creates account, profile and wallet), returns `{ accessToken, refreshToken }` |
| `POST` | `/account/sign-in` | — | Sign in with email or username |
| `POST` | `/account/refresh` | — | Rotate the refresh token, returns a fresh token pair |
| `POST` | `/account/sign-out` | — | Revoke a refresh session |
| `GET` | `/account/me` | ✓ | Current account with profile |

### Profile, Addresses & Wallet

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` / `PATCH` | `/profile/me` | ✓ | View / update the profile |
| `GET` / `POST` | `/addresses` | ✓ | List / create delivery addresses |
| `PATCH` / `DELETE` | `/addresses/:id` | ✓ | Update / delete an address |
| `GET` | `/wallet` | ✓ | Wallet balance |
| `GET` | `/wallet/transactions` | ✓ | Ledger history (paginated) |
| `POST` | `/wallet/deposit` | ✓ | Top up `{ amount }` |
| `POST` | `/wallet/withdraw` | ✓ | Withdraw `{ amount }` |

### Stores & Catalog

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/stores` | ✓ | Create a store (starts as `DRAFT`) |
| `GET` | `/stores/my` | ✓ | Stores owned by the current account |
| `GET` | `/stores/:slug` | — | Public store page |
| `PATCH` | `/stores/:id` | ✓ | Update store details |
| `PATCH` | `/stores/:id/status` | ✓ | Change status (`ACTIVE`, `SUSPENDED`, `CLOSED`) |
| `DELETE` | `/stores/:id` | ✓ | Soft-delete a store |
| `GET` | `/categories` | — | Category tree |
| `GET` | `/categories/:slug` | — | Category with children |
| `POST` / `PATCH` / `DELETE` | `/categories…` | ✓ | Manage categories |
| `GET` | `/products` | — | Public catalog (`storeSlug`, `categorySlug`, `search`, `brand`, pagination) |
| `GET` | `/products/:id` | — | Product details with variants and rating |
| `GET` | `/products/store/:storeId` | ✓ | Seller view of store products (all statuses) |
| `POST` | `/products` | ✓ | Create a product with variants |
| `PATCH` / `DELETE` | `/products/:id` | ✓ | Update / archive a product |
| `POST` | `/products/:id/variants` | ✓ | Add a variant |
| `PATCH` / `DELETE` | `/products/variants/:variantId` | ✓ | Update / deactivate a variant |

### Stock

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/stocks/store/:storeId` | ✓ | Stock levels for a store |
| `GET` | `/stocks/:id/movements` | ✓ | Movement journal |
| `POST` | `/stocks/adjust` | ✓ | `INCOME` / `CORRECTION` / `WRITE_OFF` adjustment |
| `PATCH` | `/stocks/:id` | ✓ | Update `minQuantity` / `isActive` |

### Carts, Orders, Payments & Reviews

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/carts` | ✓ | Carts of the current buyer (one per store) |
| `POST` | `/carts/items` | ✓ | Add a variant to the cart |
| `PATCH` / `DELETE` | `/carts/items/:itemId` | ✓ | Change quantity / remove an item |
| `DELETE` | `/carts/:cartId` | ✓ | Clear a cart |
| `POST` | `/orders/checkout` | ✓ | Create an order from a cart `{ cartId, addressId }` |
| `GET` | `/orders/my` | ✓ | Buyer's orders (filter by `status`) |
| `GET` | `/orders/my/:id` | ✓ | Order details with items, payments and history |
| `POST` | `/orders/my/:id/cancel` | ✓ | Cancel while `PENDING` (releases stock, refunds) |
| `POST` | `/orders/my/:id/complete` | ✓ | Confirm receipt (`DELIVERED → COMPLETED`) |
| `GET` | `/orders/store/:storeId` | ✓ | Seller's order list |
| `GET` | `/orders/managed/:id` | ✓ | Seller's order details |
| `PATCH` | `/orders/managed/:id/status` | ✓ | Seller status transition (`ACCEPTED`, …, `RETURNED`) |
| `POST` | `/payments/pay` | ✓ | Pay from the wallet `{ orderId, idempotencyKey? }` |
| `GET` | `/payments/order/:orderId` | ✓ | Payments of an order |
| `POST` | `/reviews` | ✓ | Review a delivered order item |
| `GET` | `/reviews/product/:productId` | — | Public product reviews |
| `GET` | `/reviews/my` | ✓ | Buyer's reviews |
| `PATCH` / `DELETE` | `/reviews/:id` | ✓ | Update / delete own review |

## Postman

A ready-to-use collection lives in [`postman/`](postman/):

- [`postgres-practice.postman_collection.json`](postman/postgres-practice.postman_collection.json) — every endpoint, grouped by domain, with example bodies;
- [`local.postman_environment.json`](postman/local.postman_environment.json) — local environment (`baseUrl`, tokens, entity ids).

The collection is self-wiring: sign-up/sign-in scripts store the token pair, and create-requests capture entity ids (`storeId`, `productId`, `variantId`, `cartId`, `orderId`, …) into variables, so the happy path can be executed top-to-bottom without copy-pasting a single id. See [`postman/README.md`](postman/README.md) for the walkthrough.

## Testing

```bash
yarn test        # unit tests
yarn test:cov    # with coverage
yarn lint        # eslint (lint:fix to autofix)
```

Unit tests cover the money-critical paths (wallet debit/credit, ledger entries, event publishing), auth flows (registration, login edge cases, refresh rotation) and profile access. Services are tested in isolation with mocked Prisma/RabbitMQ clients.

## Project Structure

```
src/
├── common/            # filters, base errors, decorators, pagination, utils
├── config/            # typed app config + env validation
├── database/          # PrismaService (PostgreSQL), Mongoose connection
├── generated/prisma/  # generated Prisma client (checked in)
├── modules/
│   ├── accounts/      # auth, refresh sessions
│   ├── addresses/
│   ├── carts/
│   ├── categories/
│   ├── orders/        # checkout + status state machine
│   ├── payments/
│   ├── products/      # products + variants
│   ├── profiles/
│   ├── reviews/
│   ├── stocks/        # stock + movement journal
│   ├── stores/
│   ├── transactions/  # RabbitMQ consumer → MongoDB audit log
│   └── wallets/       # wallet + ledger
└── shared/
    ├── auth/          # TokenService, JwtAuthGuard
    ├── contracts/     # event contracts
    └── messaging/     # RabbitMQ client
```

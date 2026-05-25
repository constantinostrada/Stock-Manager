# Stock Manager

A production-ready inventory and stock management system built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Prisma**, **SQLite**, **Server Actions**, and **Zod**.

---

## Features

- 📦 **Product management** — create, read, update, and delete products with SKU validation
- 📊 **Stock level tracking** — per-product quantity tracking with configurable minimum thresholds
- 📝 **Stock movements audit log** — immutable record of every IN / OUT / ADJUSTMENT operation
- ⚠️ **Low stock alerts** — dashboard flags products at or below their minimum threshold
- 💰 **Inventory valuation** — calculates total inventory value at cost
- 🗂️ **Category organisation** — group products for easier filtering and reporting

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| ORM | Prisma 5 |
| Database | SQLite (via Prisma) |
| Validation | Zod 3 |
| Architecture | Clean Architecture |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment
cp .env.example .env

# 3. Generate the Prisma client
npm run db:generate

# 4. Run database migrations
npm run db:migrate

# 5. (Optional) Seed with sample data
npm run db:seed

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format all files with Prettier |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create and apply a new migration |
| `npm run db:migrate:prod` | Apply pending migrations (production) |
| `npm run db:studio` | Open Prisma Studio (GUI) |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Reset database and re-run all migrations |

---

## Project Structure

```
stock-manager/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # SQL migration files
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Dashboard
│   │   ├── products/          # Product CRUD pages
│   │   └── stock/             # Stock management pages
│   ├── components/            # React UI components
│   │   ├── layout/            # Navbar, shell
│   │   ├── products/          # Product-specific components
│   │   ├── stock/             # Stock-specific components
│   │   └── ui/                # shadcn/ui base components
│   ├── hooks/                 # Client-side React hooks
│   ├── lib/                   # Shared utilities (cn helper)
│   │
│   ├── domain/                # ← Clean Architecture: Domain Layer
│   ├── application/           # ← Clean Architecture: Application Layer
│   ├── infrastructure/        # ← Clean Architecture: Infrastructure Layer
│   └── interfaces/            # ← Clean Architecture: Interfaces Layer
```

---

## Clean Architecture

This project follows **Clean Architecture** principles with strict unidirectional dependencies:

```
interfaces → application → domain
infrastructure → application → domain
```

### Layer Responsibilities

#### `src/domain/` — The Core
> Zero knowledge of the outside world. No third-party dependencies.

- **Entities** (`entities/`) — Business objects with identity and lifecycle. They enforce their own invariants in the constructor (`Product`, `StockLevel`, `StockMovement`, `Category`).
- **Value Objects** (`value-objects/`) — Immutable objects with equality by value (`SKU`, `Money`, `MovementType`).
- **Repository Interfaces** (`repositories/`) — Abstract contracts describing *what* data operations are available — not *how* they're implemented.
- **Domain Services** (`services/`) — Logic that spans multiple entities (`StockCalculatorService`).
- **Domain Exceptions** (`exceptions/`) — `DomainException` — the base for all business rule violations.

#### `src/application/` — Orchestration
> Knows *what* to do, not *how*. No ORM, HTTP, or infrastructure details.

- **Use Cases** (`use-cases/`) — One class per use case, each with an `execute(dto)` method (`CreateProductUseCase`, `AdjustStockUseCase`, etc.).
- **DTOs** (`dtos/`) — Typed input/output contracts between layers. Use cases return DTOs — never raw domain entities.
- **Mappers** (`mappers/`) — Convert domain entities ↔ DTOs.
- **Application Exceptions** (`exceptions/`) — `NotFoundException`, `ConflictException`, `ValidationException`.

#### `src/infrastructure/` — I/O Implementations
> Implements domain/application interfaces. All I/O lives here.

- **`database/prismaClient.ts`** — Prisma singleton with hot-reload protection.
- **`repositories/`** — Concrete Prisma implementations of the domain repository interfaces. Each maps DB rows ↔ domain entities.
- **`container.ts`** — Dependency injection wiring. The only file where infrastructure meets application. Instantiates all repositories and use cases.
- **`database/seed.ts`** — Development seeding script.

#### `src/interfaces/` — Entry Points
> Translates external input into use case calls. Thin controllers only.

- **`actions/`** — Next.js Server Actions. Each action: validates input with Zod → calls a use case → returns a typed `ActionResult`.
- **`validation/`** — Zod schemas for structural/format validation (not business rules).

### Dependency Rule — Enforced

| Layer | Can import from | Cannot import from |
|---|---|---|
| `domain` | `domain` only | `application`, `infrastructure`, `interfaces` |
| `application` | `domain`, `application` | `infrastructure`, `interfaces` |
| `infrastructure` | `domain`, `application`, `infrastructure` | `interfaces` |
| `interfaces` | `application`, `interfaces` | `domain` directly, `infrastructure` directly |

> **Note:** `interfaces/` imports from `infrastructure/container.ts` to receive pre-wired use case instances. It never imports individual repository implementations.

### Path Aliases

Defined in `tsconfig.json` to make layer boundaries visible at a glance:

```ts
import { Product } from "@domain/entities/Product";
import { CreateProductUseCase } from "@application/use-cases/product/CreateProductUseCase";
import { prisma } from "@infrastructure/database/prismaClient";
import { createProduct } from "@interfaces/actions/productActions";
```

---

## Database

SQLite is used for zero-setup development. The Prisma schema is located at `prisma/schema.prisma`.

To switch to PostgreSQL or MySQL for production, update the `datasource` block in `schema.prisma` and set `DATABASE_URL` accordingly — no application code changes are needed.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Prisma connection string | `file:./prisma/dev.db` |
| `NODE_ENV` | Node environment | `development` |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a Pull Request

---

## License

MIT

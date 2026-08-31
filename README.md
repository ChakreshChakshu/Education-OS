# Education Operating System (EOS)

EOS is an enterprise-grade, multi-tenant Education Operating System designed with Clean Architecture and Domain-Driven Design (DDD) principles using a Modular Monolith architecture.

## Tech Stack

- **Monorepo Management:** `pnpm` workspaces & `Turborepo`
- **Frontend:** Next.js (Latest App Router), JavaScript, TailwindCSS, shadcn/ui
- **Backend:** Node.js & Fastify (REST API, decoupled from frontend)
- **Background Jobs:** Node.js Workers (Stateless queue consumers & cron schedulers)
- **Database Layer:** PostgreSQL & Drizzle ORM
- **Authentication:** JWT, HttpOnly Cookies
- **Architecture Enforcement:** `dependency-cruiser`
- **Media Processing:** FFmpeg, Video.js, HLS stream configurations

---

## Monorepo Layout

```text
education-os/
├── apps/               # Applications
│   ├── web/            # Next.js App Router Frontend
│   ├── api/            # Fastify REST API (with Composition Root)
│   └── worker/         # Background Worker Service
├── packages/           # Shared libraries & modules
│   ├── core/           # DDD base primitives (Entity, AggregateRoot, Result, etc.)
│   ├── modules/        # 17 framework-agnostic domain modules (identity, courses, etc.)
│   ├── infrastructure/ # System providers (database, storage, queue, mail, etc.)
│   ├── contracts/      # API response/request DTOs and Event structures
│   ├── config/         # System settings, feature flags, constants
│   ├── ui/             # Design token & UI configurations
│   └── utils/          # General helpers
├── docs/               # Standard documentation and architecture guides
└── docker/             # Container configuration files
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### Installation

Install all package dependencies in the workspace root:

```bash
pnpm install
```

### Running Locally

To spin up development servers for all apps (`web`, `api`, `worker`):

```bash
pnpm dev
```

To run a specific application (e.g. Fastify REST API):

```bash
pnpm --filter @eos/api dev
```

---

## Scripts

Root commands run across the monorepo via Turborepo & dependency-cruiser:

- `pnpm dev`: Start all apps concurrently in development mode.
- `pnpm build`: Compile all workspace applications and packages.
- `pnpm lint`: Lint code style and quality across the workspace.
- `pnpm depcruise`: Validate Clean Architecture dependency rules across all modules.
- `pnpm format`: Format all files using Prettier.
- `pnpm test`: Execute automated test suites.
- `pnpm clean`: Wipe out all `node_modules` and build directories.

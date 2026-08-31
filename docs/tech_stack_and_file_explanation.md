# EOS Tech Stack Rationale & File-by-File Explanation

This document provides a complete guide to the technology stack selected for the Education Operating System (EOS), a comparative analysis explaining why these tools were chosen over standard Next.js API Routes or Express, and a detailed file-by-file breakdown of the repository.

---

# Part 1: Tech Stack Selection & Architectural Rationale

## 1. Fastify vs. Next.js API Routes vs. Express

### Why Fastify for Backend API?

| Feature / Criteria | Fastify (Chosen) | Next.js API Routes | Express.js |
| :--- | :--- | :--- | :--- |
| **Architecture** | Dedicated, Decoupled REST Server | Coupled to Frontend Server/Serverless | Monolithic Server |
| **Performance** | Extremely High (Radix-tree router, ~75k req/sec) | Medium (Serverless overhead / Next runtime bundle) | Low-Medium (Legacy regexp routing, ~15k req/sec) |
| **Deployment Flexibility** | Independent Docker/VPS/K8s/Bare-metal | Bound to Next.js host (Vercel / Next Server) | VPS / Docker |
| **Plugin Ecosystem** | Native Async Encapsulated Plugins | Manual Middleware Wrapping | Callback Middleware Chain |
| **Schema Validation** | Built-in JSON Schema / Fast serialization | Manual per route | Manual per route |
| **Cold Starts** | Zero (Persistent long-running server) | High in Serverless environments | Zero |

#### Detailed Rationale:
1. **Decoupling Frontend & Backend:** Next.js App Router API routes merge the frontend Node.js server with the backend API. For an enterprise Education OS serving mobile applications, third-party webhooks, background worker hooks, and multi-tenant admin dashboards, coupling API logic to Next.js build cycles creates vendor lock-in and limits deployment flexibility.
2. **Superior Throughput & Low Overhead:** Fastify is built from the ground up for maximum throughput using a Radix tree router (`find-my-way`) and fast-json-stringify, making it up to 4x–5x faster than Express and significantly lighter on memory.
3. **Robust Plugin Encapsulation:** Fastify's plugin system guarantees encapsulated context (decorators, hooks, schemas), preventing accidental cross-route side effects common in Express middleware chains.

---

## 2. Monorepo Tooling (`pnpm` + `Turborepo`)

- **pnpm Workspaces:** Uses a content-addressable storage system with hard links and symlinks. Unlike `npm` or `yarn` (which flatten dependencies and cause "phantom dependency" bugs), `pnpm` enforces strict isolation between monorepo packages and speeds up installation times.
- **Turborepo:** Orchestrates task execution (`build`, `lint`, `test`) using a high-performance build graph with remote/local caching. Unchanged packages are restored instantly from cache.

---

## 3. Database Layer (`PostgreSQL` + `Drizzle ORM`)

- **PostgreSQL:** Reliable, ACID-compliant relational database with native JSONB support for semi-structured domain data.
- **Drizzle ORM vs. Prisma / TypeORM:** 
  - Prisma generates a heavy Rust engine binary, introducing cold starts and query abstraction overhead.
  - Drizzle ORM is lightweight, type-safe, and operates with **zero runtime overhead**. It compiles directly to raw SQL, giving complete control over database performance and query tuning.

---

## 4. Architecture Enforcement (`dependency-cruiser`)

- Standard linters (`ESLint`) only inspect individual file syntaxes.
- `dependency-cruiser` analyzes the entire dependency graph to enforce Clean Architecture layer rules statically (e.g., Domain layer must never import Infrastructure or Presentation).

---

# Part 2: Comprehensive File-by-File Breakdown

Below is an explanation of every core file in the repository scaffolding and its specific purpose in the system:

---

## Applications (`apps/`)

### 1. `apps/api/package.json`
- **Purpose:** Package definition for the `@eos/api` backend service.
- **Key Dependencies:** `fastify` (REST server framework), `@fastify/cors` (CORS plugin), `dotenv` (environment variables manager).

### 2. `apps/api/src/index.js`
- **Purpose:** Entry point for the Fastify REST API server.
- **Functionality:** Initializes the Fastify instance, registers CORS middleware, invokes the Composition Root dependency registration (`registerProviders`, `registerServices`), mounts versioned route plugins (`/api/v1/internal`, `/api/v1/public`), and listens on the environment port.

### 3. `apps/api/src/bootstrap/container.js`
- **Purpose:** Dependency Injection (DI) Container core implementation.
- **Functionality:** Provides a `Container` class storing registered singletons and factories. Allows resolving fully configured Use Cases and Repositories without manual instantiation across routes.

### 4. `apps/api/src/bootstrap/providers.js`
- **Purpose:** Composition Root provider registrar.
- **Functionality:** Binds concrete infrastructure adapters (`LocalStorageProvider`, `PostgresQueueProvider`, `InMemoryCacheProvider`, `JwtAuthProvider`) to the container.

### 5. `apps/api/src/bootstrap/services.js`
- **Purpose:** Composition Root domain services and repositories registrar.
- **Functionality:** Registers application use cases and database repositories into the container.

### 6. `apps/api/src/routes/v1/internal/index.js`
- **Purpose:** Fastify plugin for internal dashboard API endpoints.
- **Functionality:** Encapsulates internal routes (e.g., `/health`, `/me`) accessed by administrative users and dashboard frontends.

### 7. `apps/api/src/routes/v1/public/index.js`
- **Purpose:** Fastify plugin for public API endpoints.
- **Functionality:** Encapsulates public endpoints (e.g., `/ping`, `/auth/login`) reserved for external consumers and public workflows.

### 8. `apps/web/`
- **Purpose:** Next.js App Router frontend application.
- **Functionality:** Delivers user interfaces, authentication contexts (`AuthProvider.jsx`), utility classes (`lib/utils.js`), and HTTP client services (`services/api.js`).

### 9. `apps/worker/`
- **Purpose:** Background job processing service.
- **Functionality:** Execution host containing queue consumers, interval task schedulers, video transcoding processors, and mail dispatch workers.

---

## Infrastructure Packages (`packages/infrastructure/`)

### 10. `packages/infrastructure/database/src/client/index.js`
- **Purpose:** PostgreSQL connection pool initialization.

### 11. `packages/infrastructure/database/src/schema/index.js`
- **Purpose:** Centralized Drizzle schema export registry.

### 12. `packages/infrastructure/database/src/migrations/index.js`
- **Purpose:** Helper routines for running Drizzle SQL migrations.

### 13. `packages/infrastructure/database/src/repositories/index.js`
- **Purpose:** Base class for concrete database repositories.

### 14. `packages/infrastructure/database/src/seed/index.js`
- **Purpose:** Database seeding script runner for default system data.

### 15. `packages/infrastructure/database/src/transactions/index.js`
- **Purpose:** Transaction helper implementing the project rule: **One Use Case = One Transaction**.

### 16. `packages/infrastructure/database/src/index.js`
- **Purpose:** Primary export file aggregating client, schema, migrations, repositories, seed, and transaction modules.

### 17. `packages/infrastructure/cache/src/index.js`
- **Purpose:** Cache infrastructure module.
- **Functionality:** Defines the abstract `CacheProvider` class, provides `InMemoryCacheProvider` as default, and includes `RedisCacheProvider` stub for future scaling.

---

## Domain Modules (`packages/modules/*/presentation/`)

Across all 17 domain modules (`identity`, `tenant`, `organization`, `users`, `courses`, `curriculum`, `lessons`, `enrollments`, `learning`, `assessments`, `certificates`, `video`, `files`, `notifications`, `analytics`, `billing`, `administration`):

### 18. `packages/modules/<module>/presentation/controllers/index.js`
- **Purpose:** Framework-agnostic controller methods executing Application Use Cases.

### 19. `packages/modules/<module>/presentation/validators/index.js`
- **Purpose:** Input validation schemas ensuring payload data integrity.

### 20. `packages/modules/<module>/presentation/serializers/index.js`
- **Purpose:** Formats domain data into standardized DTO response contracts.

### 21. `packages/modules/<module>/presentation/index.js`
- **Purpose:** Re-exports presentation controllers, validators, and serializers.

---

## Root Tooling & Documentation

### 22. `.dependency-cruiser.js`
- **Purpose:** Configuration file for `dependency-cruiser`.
- **Functionality:** Enforces strict Clean Architecture rules: domain isolation, inverted dependency, and zero circular dependencies.

### 23. `package.json` (Root)
- **Purpose:** Workspace root manifest configuring `pnpm` workspace scripts (`dev`, `build`, `lint`, `depcruise`, `test`) and devDependencies.

### 24. `docs/README.md`
- **Purpose:** Comprehensive guide establishing architectural standards and conventions.

### 25. `docs/architecture_reviews.md`
- **Purpose:** Records architectural decisions, refactoring proposals, and rationale.

### 26. `docs/setup_summary.md`
- **Purpose:** Executive summary documenting repository layout and verification results.

# 06 – Module Architecture

## Purpose

This document defines the internal module architecture for the Education Operating System (EOS).

It establishes clear module boundaries, strict dependency rules, inter-context communication standards, and folder organization to ensure the codebase remains maintainable, testable, and scalable for the next 10+ years.

---

# Architecture Principles

- **Modular Monolith:** Single deployment artifact composed of isolated, extractable domain modules.
- **Domain-Driven Design (DDD):** Rich domain entities, aggregates, repositories, and value objects.
- **Clean Architecture & Dependency Inversion:** Dependencies always point inward toward the Domain.
- **API First:** Fully decoupled presentation handlers and contracts.
- **Provider Agnostic:** Infrastructure adapters implement domain interfaces.
- **Event-Driven Asynchrony:** Non-blocking cross-module operations via domain events.
- **Framework-Independent Business Logic:** Pure JavaScript/TypeScript domain logic free of HTTP or database dependencies.

---

# Three-Layered Package Structure

To maintain absolute clarity across the monorepo, packages are grouped into three distinct architectural categories:

```text
packages/
├── domains/              <-- Business Capabilities (DDD Bounded Contexts)
│   ├── identity/
│   ├── academics/
│   ├── learning/
│   ├── media/
│   └── platform/
│
├── infrastructure/       <-- Technical Implementations & Driver Adapters
│   ├── database/         (Drizzle ORM & PostgreSQL Client)
│   ├── storage/          (Cloudflare R2 & Storage Drivers)
│   ├── queue/            (InMemory & Redis Event Queue)
│   ├── mail/             (Email Delivery Drivers)
│   ├── logger/           (Pino Structured Logging)
│   └── auth/             (JWT & Crypto Providers)
│
└── shared/               <-- Cross-Cutting Utilities & System Primitives
    ├── core/             (Result, Entity, ValueObject, DomainEvent)
    ├── contracts/        (DTOs & API Schemas)
    ├── config/           (Environment Validation & Feature Flags)
    └── utils/            (Pure Utility Functions)
```

---

# Bounded Context Domains (`packages/domains/`)

### 1. `identity` Context
- **Responsibilities:** User authentication, tenant management, organization scoping, global identity, RBAC roles, and permissions.
- **Sub-domains:** `users`, `tenants`, `organizations`, `roles`, `permissions`.

### 2. `academics` Context
- **Responsibilities:** Course catalog, hierarchical categories, course versioning, curriculum structure, and lesson definitions.
- **Sub-domains:** `courses`, `categories`, `course-versions`, `curriculum`, `lessons`.

### 3. `learning` Context
- **Responsibilities:** Cohort course offerings, student enrollments, atomic lesson progress, polymorphic assessments, attempts, and certificate issuance.
- **Sub-domains:** `offerings`, `enrollments`, `progress`, `assessments`, `certificates`.

### 4. `media` Context
- **Responsibilities:** Media assets, video metadata, HLS transcoding job definitions, poster thumbnails, and subtitle attachments.
- **Sub-domains:** `media-assets`, `videos`, `subtitles`, `processing`.

### 5. `platform` Context
- **Responsibilities:** Notification delivery, subscription billing, analytics pipelines, system administration, and security audit logs.
- **Sub-domains:** `notifications`, `analytics`, `billing`, `administration`, `audit`.

---

# Internal Context Layering

Every bounded context package within `packages/domains/` follows the exact same 4-layer Clean Architecture structure:

```text
context/
├── domain/               <-- Pure Domain Business Logic
│   ├── entities/
│   ├── value-objects/
│   ├── aggregates/
│   ├── events/
│   ├── repositories/    (Interfaces only!)
│   └── exceptions/
│
├── application/          <-- Use Case Orchestration & Workflows
│   ├── commands/
│   ├── queries/
│   ├── use-cases/
│   ├── dto/
│   └── services/
│
├── infrastructure/       <-- Persistence Mappers & Repository Implementations
│   ├── repositories/    (Drizzle ORM implementation of Domain contracts)
│   ├── mappers/
│   └── event-handlers/
│
├── presentation/         <-- Framework Handlers & DTO Serializers
│   ├── controllers/
│   ├── validators/
│   └── serializers/
│
├── tests/
│   ├── unit/
│   └── integration/
└── README.md
```

---

# Layer Rules & Directives

```text
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│     (Fastify Route Handlers, Controllers, DTOs)         │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│     (Use Cases, Commands, Queries, Workflows)           │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      Domain Layer                       │
│  (Entities, Aggregates, ValueObjects, Repository IFs)   │
└────────────────────────────▲────────────────────────────┘
                             │
                             │ Implements Contracts
┌────────────────────────────┴────────────────────────────┐
│                  Infrastructure Layer                   │
│     (Drizzle Repositories, R2 Drivers, Queue Adapters)  │
└─────────────────────────────────────────────────────────┘
```

1. **Domain Layer:** Pure business logic. Zero imports from database drivers, HTTP frameworks, or external infrastructure SDKs.
2. **Application Layer:** Executes use case workflows, coordinates transaction boundaries, calls domain services, and dispatches domain events.
3. **Infrastructure Layer:** Implements repository contracts defined by the Domain layer using Drizzle ORM, R2 SDK, or Mail drivers.
4. **Presentation Layer:** Parses HTTP requests, validates DTO inputs, invokes application use cases, and formats API JSON responses.

---

# Repository Ownership & Dependency Inversion

Repository contracts live in the **Domain layer**. Database implementations live in the **Infrastructure layer**.

```text
Domain Layer (packages/domains/academics/domain/repositories/CourseRepository.js)
  └── Interface: CourseRepository

Infrastructure Layer (packages/domains/academics/infrastructure/repositories/PostgresCourseRepository.js)
  └── Implementation: PostgresCourseRepository implements CourseRepository
```

---

# Cross-Module Communication Rules

### Allowed Patterns:
1. **Direct Public Use Case Calls:** Bounded context `A` calls a public application service query in Bounded Context `B` via Dependency Injection.
2. **Asynchronous Domain Events:** Bounded context `A` dispatches a `DomainEvent` (e.g. `EnrollmentCompletedEvent`); Bounded Context `B` (Certificates) handles the event asynchronously via the Queue driver.

### Forbidden Patterns:
- ❌ **No Direct Repository-to-Repository Access Across Contexts.**
- ❌ **No Cross-Context Database Joins or Queries.**
- ❌ **No Circular Dependencies Between Domains.**
- ❌ **No Internal Layer Leaks** (e.g., Presentation layer importing Infrastructure Drizzle clients directly).

---

# Transaction Boundary Directive

> [!IMPORTANT]
> ### One Command Use Case = One Database Transaction
> Every mutating use case operation executes inside an explicit database transaction.
> - Transaction begins at the start of the use case.
> - Data operations commit atomically.
> - Domain events are dispatched **only after successful transaction commit**.

---

# Composition Root

Dependency Injection is configured centrally inside `apps/api/src/bootstrap/`:

```text
apps/api/src/bootstrap/
├── container.js       (Central DI Container)
├── providers.js       (Registers Infrastructure Storage, Database, Auth Drivers)
└── services.js        (Registers Domain Repositories and Application Use Cases)
```

Route handlers never instantiate repositories or infrastructure providers directly.

---

# Architectural Decision Records (ADRs)

---

## ADR-022: Bounded Context Package Organization

### Status
**Accepted**

### Context
Maintaining 17 independent packages created extreme boilerplate and management overhead.

### Decision
Group related capabilities into 5 primary bounded context packages (`identity`, `academics`, `learning`, `media`, `platform`) inside `packages/domains/`.

### Benefits
- High cohesion and simplified monorepo management.
- Clean DDD bounded context boundaries.
- Preserves future microservice extraction capabilities.

---

## ADR-023: Repository Interface Ownership in Domain

### Status
**Accepted**

### Context
Clean Architecture requires business logic to remain completely agnostic of database technology.

### Decision
Place repository interfaces inside `domain/repositories/` of each bounded context. Implementations reside in `infrastructure/repositories/`.

### Benefits
- Absolute framework and ORM independence.
- Fast unit testing using mock repositories.

---

## ADR-024: Strict Inward Dependency Rule

### Status
**Accepted**

### Context
Preventing architectural degradation over long-term project lifecycles.

### Decision
Enforce strict inward dependency flow via `.dependency-cruiser.js` static analysis guards.

### Benefits
- Zero circular dependencies.
- Enforces Clean Architecture in CI/CD pipeline.

---

# Guiding Principle

> **A bounded context owns its business capabilities end-to-end. Communication between contexts occurs only through public application services or domain events. The domain remains independent of frameworks, databases, and infrastructure, ensuring the architecture can evolve without major rewrites.**

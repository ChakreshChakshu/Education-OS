# EOS Architecture Review & Resolution Proposal (Revised)

This document captures the architectural decisions and refinements adopted after reviewing the initial repository scaffold. The objective is to establish a maintainable, framework-agnostic, and production-ready foundation for the Education Operating System (EOS).

---

# 1. Backend Framework

## Assessment

The backend should be independently deployable from the frontend. Since the platform is expected to support VPS deployments, mobile applications, public APIs, and future service extraction, coupling the backend to Next.js API routes is not ideal.

## Decision

Use **Fastify** as the dedicated backend framework.

The frontend remains an independent **Next.js** application.

## Benefits

* Independent deployment
* Better separation of concerns
* Lightweight and high performance
* Excellent plugin ecosystem
* Framework-independent business logic
* Easier support for mobile apps and third-party integrations

---

# 2. Framework-Agnostic Domain Modules

## Assessment

Business modules must remain completely independent of Fastify (or any future HTTP framework).

## Decision

Each module exposes plain controllers, validators, and serializers without depending on HTTP request/response objects.

```text
presentation/
├── controllers/
├── validators/
└── serializers/
```

This allows the same business logic to be reused by:

* REST API
* Background workers
* CLI commands
* Scheduled jobs
* Future GraphQL or gRPC adapters

---

# 3. Cache Provider

## Assessment

Redis should not be a mandatory dependency during the initial development phase.

## Decision

Introduce a provider abstraction.

```text
CacheProvider
├── InMemoryCacheProvider
└── RedisCacheProvider (Future)
```

The default implementation will use an in-memory cache.

---

# 4. Architecture Style

## Decision

The platform will follow a **Modular Monolith** architecture.

Each domain module is independently testable and may be extracted into an independently deployable service in the future if business or scaling requirements justify it.

Microservices are considered a future deployment strategy, not the starting architecture.

---

# 5. Database Package

The infrastructure database package will contain:

```text
database/
├── client/
├── schema/
├── migrations/
├── repositories/
├── seed/
└── transactions/
```

Responsibilities include:

* Database client
* Drizzle schema
* Migration management
* Repository implementations
* Seed scripts
* Transaction helpers

---

# 6. API Versioning

API routes should be versioned from the beginning.

```text
src/routes/

v1/
├── internal/
│   ├── auth/
│   ├── courses/
│   └── users/
│
└── public/
    └── ...
```

This enables future API evolution without breaking existing clients.

---

# 7. Background Worker

The worker acts only as an execution host.

Responsibilities include:

* Queue consumers
* Scheduled jobs
* Video processing
* Email dispatch
* Notification delivery
* Retry handling

Rules:

* Workers must be stateless.
* Jobs must be idempotent.
* Multiple worker instances must be supported safely.

Business rules remain inside Application Use Cases.

---

# 8. Clean Architecture Dependency Rules

Dependency flow:

```text
Presentation
        ↓
Application
        ↓
Domain
        ↑
Infrastructure
```

Infrastructure implements interfaces defined by the Domain/Application layers.

### Rules

* Domain must never depend on Infrastructure.
* Domain must never depend on Presentation.
* Application must never depend on Presentation.
* Infrastructure depends inward.
* Circular dependencies are prohibited.

---

# 9. Composition Root

All dependency wiring is centralized.

```text
apps/api/

src/
└── bootstrap/
    ├── container.js
    ├── providers.js
    └── services.js
```

Responsibilities include:

* Register infrastructure providers
* Register repositories
* Register application services
* Resolve dependencies for controllers

Route handlers should never instantiate repositories or providers directly.

---

# 10. Module Communication

Modules communicate through well-defined boundaries.

### Synchronous Communication

A module consumes another module through its published application interface.

### Asynchronous Communication

Modules publish Domain Events.

Initially:

* In-process event dispatcher

Future:

* SQS
* RabbitMQ
* Kafka (only if justified)

Modules must never access another module's repositories or database schema directly.

---

# 11. Request Lifecycle

```text
Incoming Request
        │
        ▼
Middleware
        │
        ▼
Validation
        │
        ▼
Authentication
        │
        ▼
Authorization
        │
        ▼
Controller
        │
        ▼
Application Use Case
        │
        ▼
Repository
        │
        ▼
Database
        │
        ▼
Serializer
        │
        ▼
Response
```

This pipeline provides a consistent execution model for every request.

---

# 12. Transaction Boundaries

Project Rule:

> **One Use Case = One Database Transaction**

Guidelines:

* All state changes occur within a single transaction.
* Domain Events are published only after a successful commit.
* External side effects (email, notifications, video processing) execute asynchronously.

---

# 13. Architecture Enforcement

Architectural rules are enforced automatically.

Recommended tooling:

* dependency-cruiser
* ESLint import restrictions

Rules include:

* Domain imports only Domain and Core.
* Application cannot import Infrastructure.
* Presentation cannot be imported by business layers.
* Cross-module infrastructure access is prohibited.
* Circular dependencies are rejected during CI.

---

# Outcome

These architectural decisions establish a strong foundation for the Education Operating System by ensuring:

* Independent frontend and backend deployment
* Framework-independent business logic
* Clean Architecture compliance
* Domain-Driven Design boundaries
* Provider abstractions
* Modular monolith structure
* Future service extraction without major rewrites
* Long-term maintainability, scalability, and portability

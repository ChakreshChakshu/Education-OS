# Education Operating System (EOS) Architecture Guide

This document establishes the architecture master guide, principles, and directory of technical specifications for the Education Operating System (EOS).

---

# Architecture Document Directory

| Document Number & Title | Key Focus Areas | Link |
| :--- | :--- | :--- |
| **01 – Architecture Overview** | Modular Monolith, DDD, Clean Architecture | [architecture_principles.md](file:///home/chakresh/EducationOS/docs/architecture_principles.md) |
| **02 – Architecture Principles** | Principles, solid, provider abstractions | [architecture_principles.md](file:///home/chakresh/EducationOS/docs/architecture_principles.md) |
| **02A – Classes vs Functions Guide** | ES6 Classes vs Functional Programming rationale & trends | [classes_vs_functions_guide.md](file:///home/chakresh/EducationOS/docs/classes_vs_functions_guide.md) |
| **03 – Domain Model & Bounded Contexts** | Identity, Academics, Learning, Media, Platform contexts | [domain_model_and_bounded_contexts.md](file:///home/chakresh/EducationOS/docs/domain_model_and_bounded_contexts.md) |
| **04 – Multi-Tenant Architecture** | Shared DB, Shared Schema, tenant isolation rules | [multi_tenant_architecture.md](file:///home/chakresh/EducationOS/docs/multi_tenant_architecture.md) |
| **05 – Database Design** | PostgreSQL, Drizzle ORM, UUIDv7 primary keys | [database_design.md](file:///home/chakresh/EducationOS/docs/database_design.md) |
| **05A-01 – Identity & Tenant Data Model** | Users, Tenants, Organizations, Memberships, RBAC | [identity_and_tenant_data_model.md](file:///home/chakresh/EducationOS/docs/identity_and_tenant_data_model.md) |
| **05B – Academic Data Model** | Courses, Versioning, Offerings, Curriculum | [academic_data_model.md](file:///home/chakresh/EducationOS/docs/academic_data_model.md) |
| **05C – Learning Model** | Enrollments, Atomic Progress, Notes, Bookmarks | [learning_model.md](file:///home/chakresh/EducationOS/docs/learning_model.md) |
| **05D – Assessment Model** | Quizzes, Polymorphic Targets, Immutable Snapshotting | [assessment_model.md](file:///home/chakresh/EducationOS/docs/assessment_model.md) |
| **05E – Media & Video Architecture** | Reusable MediaAssets, FFmpeg HLS Transcoding | [media_and_video_architecture.md](file:///home/chakresh/EducationOS/docs/media_and_video_architecture.md) |
| **05F – Files & Storage Architecture** | StorageProvider, Presigned URLs, File Lifecycle | [files_and_storage_architecture.md](file:///home/chakresh/EducationOS/docs/files_and_storage_architecture.md) |
| **05G – Frontend Architecture Guide** | Next.js 16, Solid Minimalism, Outfit/Inter Typography, LMS Player | [frontend_architecture_guide.md](file:///home/chakresh/EducationOS/docs/frontend_architecture_guide.md) |
| **06 – Module Architecture** | Clean Layering (`domains/`, `infrastructure/`, `shared/`) | [module_architecture.md](file:///home/chakresh/EducationOS/docs/module_architecture.md) |
| **07 – Authentication & Authorization** | JWT, Opaque Refresh Tokens, Argon2id, Scoped RBAC | [auth_and_authorization.md](file:///home/chakresh/EducationOS/docs/auth_and_authorization.md) |
| **08 – API Design** | REST, Business Action Routes, Envelopes, Cursor Paging | [api_design.md](file:///home/chakresh/EducationOS/docs/api_design.md) |
| **08A – REST API Endpoints Reference** | Full 13 Endpoint Specs (Auth, Courses, Modules, Uploads, Quizzes, Tenants) | [api_endpoints_reference.md](file:///home/chakresh/EducationOS/docs/api_endpoints_reference.md) |
| **09 – Event & Queue Architecture** | Transactional Outbox, Jobs, Worker Retries | [event_and_queue_architecture.md](file:///home/chakresh/EducationOS/docs/event_and_queue_architecture.md) |
| **10 – Video Architecture** | Cloudflare R2 Direct Uploads, HLS Bitrate Profiles | [video_architecture.md](file:///home/chakresh/EducationOS/docs/video_architecture.md) |
| **11 – Storage Architecture** | Single Bucket Prefix Strategy, Asset Lifecycle | [storage_architecture.md](file:///home/chakresh/EducationOS/docs/storage_architecture.md) |
| **12 – Notification System** | Multi-channel Delivery, Templates, Preferences | [notification_system.md](file:///home/chakresh/EducationOS/docs/notification_system.md) |
| **13 – Observability** | Pino JSON Logs, OpenTelemetry, Prometheus, Audits | [observability.md](file:///home/chakresh/EducationOS/docs/observability.md) |
| **14 – Deployment & DevOps** | Docker Compose, Nginx, GitHub Actions, R2 Backups | [deployment_and_devops.md](file:///home/chakresh/EducationOS/docs/deployment_and_devops.md) |
| **15 – Testing Strategy** | Testing Pyramid, Testcontainers, Coverage Gates | [testing_strategy.md](file:///home/chakresh/EducationOS/docs/testing_strategy.md) |
| **16 – Future Evolution** | Roadmap, Microservice Extraction, AI Plugins | [future_evolution.md](file:///home/chakresh/EducationOS/docs/future_evolution.md) |

---

## 1. Architectural Style: Modular Monolith

EOS is designed as a **Modular Monolith**. 

- High cohesion within domain modules (`packages/domains/*`).
- Loose coupling between modules using public application interfaces and Domain Events.
- Extractable path: Any module can be separated into an independent microservice if scale demands it in the future.

---

## 2. Clean Architecture Layering & Dependency Inversion

```text
Presentation Layer (Fastify Route Controllers)
       ↓
Application Layer (Use Cases / Command Handlers)
       ↓
    Domain Layer (Entities / Value Objects / Repository Interfaces)
       ↑
Infrastructure Layer (Database Repositories / External Adapters)
```

### Strict Rules

1. **Domain Isolation:** The Domain layer contains core enterprise logic. It has zero external dependencies and must never import from Infrastructure or Presentation.
2. **Inverted Dependency:** Repositories and external service interfaces are declared in the Domain/Application layers. Concrete implementations in Infrastructure depend *inward* and implement these interfaces.
3. **No Circular Dependencies:** Direct cross-module imports are restricted. Asynchronous notifications and cross-domain triggers must use **Domain Events**.

---

## 3. Fastify API & Centralized Composition Root

`apps/api` runs a dedicated **Fastify** REST server decoupled from the Next.js frontend (`apps/web`).

### Composition Root (`apps/api/src/bootstrap/`)

All dependency wiring is centralized:
- `container.js`: Lightweight Dependency Injection container resolving singletons and factories.
- `providers.js`: Registers infrastructure providers (`StorageProvider`, `QueueProvider`, `AuthProvider`, `MailProvider`).
- `services.js`: Registers application use cases and database repositories.

### API Versioning Structure

```text
apps/api/src/routes/
└── v1/
    ├── internal/     # For internal web client / dashboard requests
    └── public/       # For third-party developer integrations & external APIs
```

---

## 4. Architectural Enforcement Tooling (`dependency-cruiser`)

Architectural integrity is enforced automatically via `dependency-cruiser`:

```bash
pnpm depcruise
```

This verifies that:
- Domain code never imports Infrastructure or Presentation code.
- Application code never imports Presentation code.
- No circular dependencies exist across the monorepo.

# 05A-02 – Domains Directory Guide (`packages/domains/`)

## 1. Executive Summary & Purpose

The `packages/domains/` directory forms the core business engine of the Education Operating System (EOS). 

Designed following **Clean Architecture** and **Domain-Driven Design (DDD)** principles, `packages/domains/` houses 5 framework-agnostic, decoupled bounded contexts. All enterprise rules, entity state transitions, business invariants, and application workflows live here—completely separated from database ORMs, HTTP web frameworks, and UI rendering code.

```text
packages/domains/
├── identity/      # Users, Tenants, Organizations, Memberships, Roles & Permissions
├── academics/     # Courses, Batches, Classes, Schedules, Curriculum Structures
├── learning/      # Lessons, Content Consumption, Quizzes, Progress Tracking
├── media/         # Video Processing, HLS Streaming, Media Assets & Storage
└── platform/      # Multi-tenant Configs, Feature Flags, System Auditing
```

---

## 2. What Problems Does `packages/domains/` Solve?

### Problem 1: Spaghetti Code & Framework Lock-in
* **Without DDD/Clean Architecture:** Business logic gets scattered across API route handlers, Next.js server actions, ORM models, and database triggers. Upgrading web frameworks (e.g., Express to Fastify) breaks business logic.
* **EOS Solution:** All domain rules are written in pure JavaScript/TypeScript. Fastify (`apps/api`) and Next.js (`apps/web`) act only as delivery mechanisms that invoke domain use cases.

### Problem 2: Slow, Fragile Unit Testing
* **Without Decoupled Domains:** Testing business logic requires spinning up a PostgreSQL database, running migrations, and launching HTTP servers.
* **EOS Solution:** Domain Entities and Use Cases depend only on abstract Repository Interfaces (`IUserRepository`, `ITenantRepository`). Unit tests run in-memory in under 150ms without external infrastructure.

### Problem 3: Multi-Tenant Data Leakage & Unclear Operational Scopes
* **Without Bounded Contexts:** User identity, tenant ownership, and branch roles get merged into messy single tables, causing authorization security holes.
* **EOS Solution:** Domain boundaries enforce explicit separation between **Global Identity** (`User`), **Tenant Gateways** (`UserTenantMembership`), and **Branch Roles** (`OrganizationMembership`).

### Problem 4: Architecture Erosion in Large Monorepos
* **Without Dependency Guardrails:** Developers accidentally import presentation code into domain logic or create circular cross-domain calls.
* **EOS Solution:** Rigid internal layer rules enforced statically by `dependency-cruiser`.

---

## 3. Standardized Internal Layer Architecture

Every bounded context under `packages/domains/<domain-name>/` follows the exact same 4-layer layout:

```text
packages/domains/<domain-name>/
├── domain/            # 1. Domain Layer (Pure Enterprise Rules)
│   ├── entities/      # Aggregates & Entities (User, Tenant, Organization)
│   ├── value-objects/ # Immutable Value Objects (Email, TenantSlug)
│   ├── repositories/  # Abstract Repository Interfaces (IUserRepository)
│   └── events/        # Domain Event Definitions
├── application/       # 2. Application Layer (Orchestration & Workflows)
│   └── use-cases/     # Business Use Cases (RegisterUserUseCase, CreateTenantUseCase)
├── infrastructure/    # 3. Infrastructure Adapters (Database & External APIs)
│   └── repositories/  # Drizzle ORM Repository Implementations
├── presentation/      # 4. Delivery Layer Helpers (Controllers, Serializers, DTOs)
├── test/              # Unit & Integration Test Suites
├── index.js           # Main Package Entry Point
└── package.json       # Workspace Package Manifest
```

---

## 4. Deep-Dive: Explanation of Directories & Files

### A. Bounded Context 1: `identity` (`packages/domains/identity/`)

Governs user accounts, multi-tenant provisionings, organization branches, and Role-Based Access Control (RBAC).

#### Root Files
* `core.js`: Bridge resolving `@eos/core` primitives cleanly across workspace environments and standalone test runners.
* `index.js`: Main package export exposing `domain`, `application`, `infrastructure`, and `presentation`.
* `package.json`: Manifest defining workspace package `@eos/domain-identity`.
* `README.md`: Architectural reference for identity domain concepts.

#### `domain/` Layer (Pure Enterprise Business Logic)
* `domain/index.js`: Central exporter for all domain primitives, entities, and repository contracts.
* `domain/value-objects/Email.js`: Value Object enforcing valid email syntax and case normalization (`user@domain.com`).
* `domain/value-objects/TenantSlug.js`: Value Object enforcing URL-safe tenant identifiers (`skillyards-edu`).
* `domain/entities/User.js`: `AggregateRoot` managing global user identity state, password hash references, and account statuses (`ACTIVE`, `SUSPENDED`).
* `domain/entities/Tenant.js`: `AggregateRoot` managing customer institution subscriptions and configuration settings.
* `domain/entities/Organization.js`: Entity representing operational branches/departments inside a tenant.
* `domain/entities/UserTenantMembership.js`: Entity managing user gateway access to a tenant.
* `domain/entities/OrganizationMembership.js`: Entity managing operational branch roles (`TENANT_OWNER`, `ORG_ADMIN`, `INSTRUCTOR`, `STUDENT`).
* `domain/repositories/IUserRepository.js`: Abstract repository interface contract for `User` persistence.
* `domain/repositories/ITenantRepository.js`: Abstract repository interface contract for `Tenant` persistence.
* `domain/repositories/IOrganizationRepository.js`: Abstract repository interface contract for `Organization` persistence.

#### `application/` Layer (Use Case Workflows)
* `application/index.js`: Exporter for all application use cases.
* `application/use-cases/RegisterUserUseCase.js`: Executes global user onboarding, duplicate email verification, and password hashing.
* `application/use-cases/CreateTenantUseCase.js`: Atomically provisions a new tenant, creates its default branch organization, and assigns the initial `TENANT_OWNER`.

#### `test/` Layer
* `test/identity.test.js`: Native test suite verifying Value Objects, Entities, and Use Cases using high-speed in-memory mock repositories.

---

### B. Bounded Context 2: `academics` (`packages/domains/academics/`)
Governs academic structures, courses, batches, classes, schedules, and faculty assignments.
* `domain/entities/`: `Course`, `Batch`, `Subject`, `ClassSchedule`.
* `domain/value-objects/`: `CourseCode`, `AcademicTerm`.
* `application/use-cases/`: `CreateCourseUseCase`, `AssignInstructorToBatchUseCase`.

---

### C. Bounded Context 3: `learning` (`packages/domains/learning/`)
Governs student learning consumption, lesson modules, progress tracking, assignments, and quizzes.
* `domain/entities/`: `LessonModule`, `StudentProgress`, `QuizSubmission`.
* `domain/value-objects/`: `Score`, `CompletionStatus`.
* `application/use-cases/`: `MarkLessonCompleteUseCase`, `SubmitQuizUseCase`.

---

### D. Bounded Context 4: `media` (`packages/domains/media/`)
Governs video asset uploads, transcode job configurations, HLS playlist streams, and cloud storage pointers.
* `domain/entities/`: `MediaAsset`, `TranscodeJob`, `HLSPlaylist`.
* `domain/value-objects/`: `MediaDuration`, `StreamQuality`.
* `application/use-cases/`: `InitiateVideoUploadUseCase`, `ProcessHLSStreamUseCase`.

---

### E. Bounded Context 5: `platform` (`packages/domains/platform/`)
Governs system-wide settings, multi-tenant feature flags, audit logging streams, and platform health.
* `domain/entities/`: `FeatureFlag`, `AuditLogEntry`, `SystemConfig`.
* `application/use-cases/`: `ToggleFeatureFlagUseCase`, `RecordAuditLogUseCase`.

---

## 5. Developer Guide: How to Add a Feature to `packages/domains/`

When adding new business capabilities to EOS:

1. **Define Value Objects & Invariants:**
   Create immutable value objects in `packages/domains/<domain>/domain/value-objects/` to encapsulate string/number validation (e.g. `Score.js`).
2. **Create/Update Domain Entity:**
   Implement domain rules inside `packages/domains/<domain>/domain/entities/` extending `Entity` or `AggregateRoot` from `@eos/core`.
3. **Declare Repository Contract:**
   Add abstract repository interface methods in `packages/domains/<domain>/domain/repositories/`.
4. **Implement Application Use Case:**
   Write the application workflow in `packages/domains/<domain>/application/use-cases/`. Accept dependencies (`repositories`, `services`) via constructor injection.
5. **Add In-Memory Unit Test:**
   Add unit tests in `packages/domains/<domain>/test/` to verify business invariants without DB/HTTP server requirements.
6. **Expose Repository in Infrastructure:**
   Implement the abstract repository in `@eos/infra-database` using Drizzle ORM and wire it in Fastify Composition Root (`apps/api/src/bootstrap/`).

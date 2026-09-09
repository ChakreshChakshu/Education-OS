# Education Operating System (EOS)

EOS is an enterprise-grade, multi-tenant Education Operating System designed with Clean Architecture and Domain-Driven Design (DDD) principles using a Modular Monolith architecture.

## Tech Stack

- **Monorepo Management:** `pnpm` workspaces & `Turborepo`
- **Frontend:** Next.js 16 (App Router), Vanilla CSS, Outfit & Inter Typography
- **Backend:** Node.js & Fastify (REST API with Composition Root DI & JWT Auth)
- **Background Jobs:** Node.js Workers (Stateless queue consumers & cron schedulers)
- **Database Layer:** Neon PostgreSQL Cloud & Drizzle ORM (Direct SQL connection)
- **Object Storage:** Cloudflare R2 / S3 (Presigned URLs & direct media uploads)
- **Authentication:** JWT, Bearer Auth Middleware
- **Architecture Enforcement:** `dependency-cruiser`

---

## Monorepo Layout

```text
education-os/
├── apps/               # Applications
│   ├── web/            # Next.js App Router Frontend (LMS Dashboard, Tenant Provisioner, Student Classroom)
│   ├── api/            # Fastify REST API (Composition Root DI & JWT Auth Middleware)
│   └── worker/         # Background Worker Service
├── packages/           # Shared libraries & modules
│   ├── core/           # DDD base primitives (Entity, AggregateRoot, ValueObject, Result)
│   ├── domains/        # Implemented Bounded Contexts
│   │   ├── identity/   # User registration, Tenant & Org provisioning
│   │   ├── academics/  # Courses, Batches, Subjects & Term management
│   │   ├── learning/   # Lesson modules, Progress tracking & Quiz submissions
│   │   └── media/      # Media assets, Presigned upload URLs & Video tracks
│   ├── infrastructure/ # Database schemas, concrete repositories, Cloudflare R2 storage, auth
│   ├── contracts/      # API response/request DTOs and Event structures
│   ├── config/         # System settings, feature flags, constants
│   ├── ui/             # Design token & UI configurations
│   └── utils/          # General helpers
├── docs/               # Architecture guides and specifications
└── docker/             # Container configuration files
```

---

## Implemented Bounded Contexts & API Endpoints

### 1. Identity Domain (`@eos/domain-identity`)
- **Entities:** `User`, `Tenant`, `Organization`, `UserTenantMembership`, `OrganizationMembership`
- **Auth & Sessions:** Short-lived (15 min) JWT access tokens paired with rotating, SHA-256-hashed opaque refresh tokens persisted in `user_sessions` (see [docs/auth_and_authorization.md](docs/auth_and_authorization.md)).
- **Authorization:** Scoped multi-tenant RBAC (`roles`, `permissions`, `role_assignments`) resolved dynamically per request — never trusted from the JWT. Default seeded roles: `ADMIN`, `INSTRUCTOR`, `STUDENT`.
- **Endpoints:**
  - `POST /api/v1/public/auth/register` (User registration with email VO validation; auto-provisions a default tenant workspace)
  - `POST /api/v1/public/auth/login` (Bcrypt credential check, issues access + refresh token pair, returns the user's tenants)
  - `POST /api/v1/public/auth/refresh` (Rotates a refresh token for a new access/refresh pair)
  - `POST /api/v1/public/auth/logout` (Revokes a single session by its refresh token)
  - `POST /api/v1/internal/tenants` (Multi-tenant institution & campus branch provisioning; owner is always the authenticated caller)

### 2. Academics Domain (`@eos/domain-academics`)
- **Entities:** `Course`, `Batch`, `Subject`
- **Value Objects:** `CourseCode`, `AcademicTerm`
- **Endpoints:**
  - `GET /api/v1/internal/academics/courses` (Multi-tenant course list)
  - `POST /api/v1/internal/academics/courses` (Course creation & code uniqueness check)
  - `GET /api/v1/internal/academics/courses/:id/modules` (List course lesson modules)
  - `POST /api/v1/internal/academics/courses/:id/modules` (Create lesson module with UUID)

### 3. Learning Domain (`@eos/domain-learning`)
- **Entities:** `LessonModule`, `StudentProgress`, `QuizSubmission`
- **Value Objects:** `Score`
- **Endpoints:**
  - `POST /api/v1/internal/learning/lessons/complete` (Student lesson completion tracking)
  - `POST /api/v1/internal/learning/quizzes/submit` (Quiz submission & auto-grading)

### 4. Media & Storage Domain (`@eos/domain-media` & `@eos/infra-storage`)
- **Entities:** `MediaAsset`, `VideoTrack`
- **Value Objects:** `FileSize`, `MimeType`
- **Endpoints:**
  - `POST /api/v1/internal/media/upload` (Direct media file upload)
  - `POST /api/v1/internal/media/presign` (Generates presigned upload URL for direct S3/R2 upload)

---

## Neon Cloud PostgreSQL & Data Layer

* **Direct Database Connectivity:** All local memory fallbacks removed from `DatabaseClient` and repositories (`DrizzleUserRepository`, `DrizzleCourseRepository`, `DrizzleLessonModuleRepository`, `DrizzleTenantRepository`). All operations interact directly with Neon Cloud PostgreSQL.
* **UUID Compliance:** Strict UUID primary keys for all database models.
* **Storage Provider:** Auto-switches between `R2StorageProvider` (Cloudflare R2) and `LocalStorageProvider`.

---

## Running Automated Tests

To execute the full workspace unit & integration test suite (`42 / 42 passing` with `DATABASE_URL` configured against a reachable Postgres instance):

```bash
node --test packages/infrastructure/storage/test/storage.test.js packages/domains/identity/test/identity.test.js packages/infrastructure/database/test/database.test.js packages/infrastructure/database/test/seed.test.js apps/api/test/api.test.js packages/domains/academics/test/academics.test.js packages/domains/learning/test/learning.test.js packages/domains/media/test/media.test.js
```

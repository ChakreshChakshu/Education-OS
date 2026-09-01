# Education Operating System (EOS)

EOS is an enterprise-grade, multi-tenant Education Operating System designed with Clean Architecture and Domain-Driven Design (DDD) principles using a Modular Monolith architecture.

## Tech Stack

- **Monorepo Management:** `pnpm` workspaces & `Turborepo`
- **Frontend:** Next.js (Latest App Router), JavaScript, Vanilla CSS
- **Backend:** Node.js & Fastify (REST API with Composition Root DI)
- **Background Jobs:** Node.js Workers (Stateless queue consumers & cron schedulers)
- **Database Layer:** Neon PostgreSQL & Drizzle ORM
- **Object Storage:** Cloudflare R2 (S3-compatible API with presigned URLs)
- **Authentication:** JWT, HttpOnly Cookies
- **Architecture Enforcement:** `dependency-cruiser`

---

## Monorepo Layout

```text
education-os/
├── apps/               # Applications
│   ├── web/            # Next.js App Router Frontend
│   ├── api/            # Fastify REST API (with Composition Root DI)
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
- **Endpoints:**
  - `POST /api/v1/public/auth/register` (User registration with email VO validation)
  - `POST /api/v1/internal/tenants` (Multi-tenant institution provisioning)

### 2. Academics Domain (`@eos/domain-academics`)
- **Entities:** `Course`, `Batch`, `Subject`
- **Value Objects:** `CourseCode`, `AcademicTerm`
- **Endpoints:**
  - `POST /api/v1/internal/academics/courses` (Course creation & code uniqueness check)
  - `POST /api/v1/internal/academics/batches` (Cohort batch provisioning & instructor assignment)

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
  - `POST /api/v1/internal/media/presign` (Generates presigned upload URL for direct S3/R2 upload)
  - `POST /api/v1/internal/media/confirm` (Confirms upload completion & triggers encoding)

---

## Multi-Tenant Database Seeder & Storage Drivers

* **Database Seeder:** Run `seedDatabase(repositories)` to populate super-admins, instructors, students, tenant institutions, courses, lesson modules, and quiz submissions.
* **Storage Provider:** Auto-switches between `R2StorageProvider` (Cloudflare R2) and `LocalStorageProvider` based on environment variables.
* **PostgreSQL Client:** Connects to Neon PostgreSQL serverless instances via `DATABASE_URL`.

---

## Running Automated Tests

To execute the full workspace unit & integration test suite (`37 / 37 passing`):

```bash
node --test packages/infrastructure/storage/test/storage.test.js packages/domains/identity/test/identity.test.js packages/infrastructure/database/test/database.test.js packages/infrastructure/database/test/seed.test.js apps/api/test/api.test.js packages/domains/academics/test/academics.test.js packages/domains/learning/test/learning.test.js packages/domains/media/test/media.test.js
```

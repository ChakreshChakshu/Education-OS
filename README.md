# Education Operating System (EOS)

EOS is an enterprise-grade, multi-tenant Education Operating System designed with Clean Architecture and Domain-Driven Design (DDD) principles using a Modular Monolith architecture.

## Tech Stack

- **Monorepo Management:** `pnpm` workspaces & `Turborepo`
- **Frontend:** Next.js (Latest App Router), JavaScript, Vanilla CSS
- **Backend:** Node.js & Fastify (REST API with Composition Root DI)
- **Background Jobs:** Node.js Workers (Stateless queue consumers & cron schedulers)
- **Database Layer:** PostgreSQL & Drizzle ORM
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
│   │   └── learning/   # Lesson modules, Progress tracking & Quiz submissions
│   ├── infrastructure/ # Database schemas, concrete repositories, storage, queue
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

---

## Running Automated Tests

To execute the full workspace unit & integration test suite (`27 / 27 passing`):

```bash
node --test packages/domains/identity/test/identity.test.js packages/infrastructure/database/test/database.test.js apps/api/test/api.test.js packages/domains/academics/test/academics.test.js packages/domains/learning/test/learning.test.js
```

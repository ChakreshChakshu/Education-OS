# 15 – Testing Strategy

## Purpose

This document defines the testing architecture and quality engineering strategy for the Education Operating System (EOS).

It establishes a balanced Testing Pyramid, Testcontainers setup for real database integration testing, automated CI quality gates, static code analysis rules, and post-deployment smoke testing to guarantee high deployment confidence and zero regressions.

---

# Core Design Principles

- **Test Behavior over Implementation:** Tests validate business domain outcomes rather than private implementation details.
- **Real Infrastructure for Integration:** Use ephemeral PostgreSQL containers (Testcontainers) instead of mocking database query behavior.
- **Isolated & Deterministic Test Execution:** Every test suite initializes its own database state and cleans up upon completion.
- **Fast Developer Feedback Loops:** Unit tests execute in under 5 seconds; integration suites execute under 60 seconds.
- **Mock External Providers Only:** Third-party networks (Resend, Cloudflare R2, Payment Gateways) are mocked; core database and domain use cases use real components.
- **Automated CI Quality Gates:** Pull requests must pass linting, static architecture analysis (`dependency-cruiser`), type-checking, and test suites prior to merge.

---

# The Testing Pyramid

```text
                             ▲
                            ╱ ╲
                           ╱   ╲
                          ╱ E2E ╲            10% End-to-End Tests
                         ╱-------╲           (Critical Business Journeys)
                        ╱         ╲
                       ╱Integration╲         20% Integration Tests
                      ╱-------------╲        (Fastify + Real PostgreSQL)
                     ╱               ╲
                    ╱   Unit Tests    ╲      70% Unit Tests
                   ╱-------------------╲     (Domain Entities & Use Cases)
                  └─────────────────────┘
```

---

# 1. Unit Testing Layer (70%)

Focuses on pure domain logic, value objects, aggregates, application use cases, and utility functions without network or database dependencies.

### Guidelines
- **Target Components:** `domain/entities/`, `domain/value-objects/`, `application/use-cases/`, validators, calculations.
- **Mocked Dependencies:** Repositories (`CourseRepository`), `QueueProvider`, `MailProvider`, `StorageProvider`.
- **Rule:** Never mock pure domain business rules or entities.

---

# 2. Integration Testing Layer with Testcontainers (20%)

Integration tests execute against a real, isolated PostgreSQL database managed via **Testcontainers**:

```text
Test Runner Executed
         │
         ▼
1. Spin up Ephemeral PostgreSQL Container (Docker)
         │
         ▼
2. Apply Drizzle ORM Migrations (pnpm db:migrate)
         │
         ▼
3. Seed Minimal Deterministic Fixtures
         │
         ▼
4. Run Integration Test Suite against Real DB
         │
         ▼
5. Destroy PostgreSQL Container
```

---

# 3. API Integration Testing

Validates Fastify route controllers, input validation schemas, authorization gates, and HTTP response envelopes without launching full browser instances.

```javascript
import { buildApp } from '@/apps/api/bootstrap';

describe('POST /api/v1/internal/courses', () => {
  it('CreateCourse_ShouldReturnCreated_WhenPayloadIsValid', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/courses',
      headers: { authorization: `Bearer ${validInstructorJwt}` },
      payload: { title: 'Advanced Distributed Systems' }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().success).toBe(true);
    expect(response.json().data.id).toBeDefined();
  });
});
```

---

# 4. End-to-End (E2E) Testing Layer (10%)

Automates critical multi-step user workflows using headless browser integration:
1. **Student Onboarding:** Registration $\rightarrow$ Email Verification $\rightarrow$ Organization Selection.
2. **Academic Workflow:** Course Creation $\rightarrow$ Lesson Publishing $\rightarrow$ Offering Enrollment.
3. **Assessment & Grading:** Exam Attempt Submission $\rightarrow$ Automatic Grading $\rightarrow$ Certificate Generation.
4. **Media Pipeline:** Direct R2 Upload $\rightarrow$ Worker Transcoding Notification $\rightarrow$ HLS Player Rendering.

---

# Mocking Strategy Directives

```text
┌─────────────────────────────────────────────────────────┐
│               Mocked Dependencies                       │
│  - MailProvider (Resend, SES, SMTP)                     │
│  - StorageProvider (Cloudflare R2, S3)                  │
│  - Payment Gateways & External Third-Party APIs         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              REAL Unmocked Components                   │
│  - Domain Entities, Value Objects, & Business Rules    │
│  - PostgreSQL Database (via Testcontainers)             │
│  - Fastify Routing, Controllers, & Response Envelopes   │
└─────────────────────────────────────────────────────────┘
```

---

# Code Coverage Targets & Static Quality Gates

### Code Coverage Targets

| Layer / Package | Minimum Coverage Target |
| :--- | :--- |
| **Domain Layer (`domain/`)** | **95%** |
| **Application Layer (`application/`)** | **90%** |
| **Infrastructure Layer (`infrastructure/`)** | **80%** |
| **API Presentation (`presentation/`)** | **80%** |

### Automated CI Quality Gates
1. **ESLint & Prettier:** Zero lint warnings or formatting errors.
2. **TypeScript Compiler (`tsc`):** Zero type errors (`--noImplicitAny`, `--strict`).
3. **Dependency Cruiser (`dependency-cruiser`):** Zero Clean Architecture inward boundary violations.
4. **Test Suite Execution:** 100% test pass rate across unit, integration, and API suites.

---

# Post-Deployment Smoke Testing

Immediately after deploying containers to production, automated smoke tests execute against `https://api.skillyards.com`:
- Verify `GET /health/ready` returns `200 OK`.
- Issue authenticating request (`POST /auth/login`).
- Query public catalog (`GET /api/v1/public/courses`).
- Verify storage provider ping (`GET /health`).

If any smoke probe fails, the GitHub Actions deployment pipeline triggers an immediate automated rollback to the previous container tag.

---

# Standardized Test Naming Convention

All test blocks follow the clear `Feature_ShouldExpectedResult_WhenCondition` pattern:

```text
CreateCourse_ShouldReturnConflict_WhenCourseCodeAlreadyExists
EnrollStudent_ShouldCalculateProgressZero_WhenEnrollmentCreated
SubmitAssessment_ShouldSnapshotAnswers_WhenExamSubmitted
```

---

# Architectural Decision Records (ADRs)

---

## ADR-055: The 70/20/10 Testing Pyramid

### Status
**Accepted**

### Context
Over-relying on fragile, slow E2E browser tests leads to slow CI pipelines and false test failures.

### Decision
Structure testing around a 70% Unit, 20% Integration, and 10% E2E distribution.

### Benefits
- Fast execution under 2 minutes in CI.
- Precise failure pinpointing.

---

## ADR-056: Real PostgreSQL Integration via Testcontainers

### Status
**Accepted**

### Context
Mocking database repositories hides SQL syntax bugs, Drizzle ORM mapping errors, and PostgreSQL constraint violations.

### Decision
Run integration tests against ephemeral PostgreSQL containers provisioned via Testcontainers.

### Benefits
- 100% production database parity.
- Catches real foreign key and index constraints during testing.

---

## ADR-057: External Infrastructure Mocking Policy

### Status
**Accepted**

### Context
Calling third-party SaaS APIs during test runs introduces flakiness, rate limits, and network latency.

### Decision
Mock external network interfaces (`MailProvider`, `StorageProvider`) while using real internal domain and database components.

### Benefits
- Fast, deterministic test runs without network flakiness.

---

## ADR-058: Automated Quality Gates in CI/CD

### Status
**Accepted**

### Context
Manual code review cannot guarantee test execution or architectural dependency adherence.

### Decision
Enforce automated CI quality gates that block pull requests failing linting, type checks, or test suites.

### Benefits
- Zero broken builds entering the `main` branch.
- Automated architectural protection via `dependency-cruiser`.

---

# Guiding Principle

> **EOS testing prioritizes fast feedback and production confidence through a balanced Testing Pyramid. Domain logic is validated with extensive unit tests, real infrastructure is used for integration testing via Testcontainers, critical user journeys are protected with focused end-to-end tests, and every change must pass automated quality gates before deployment.**

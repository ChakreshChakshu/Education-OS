# 05 - Database Design

## Purpose

This document defines the database architecture, standards, conventions, and operational strategies for the Education Operating System (EOS).

It establishes the structural rules that every database object must follow across the monorepo.

Business entities and bounded context schema maps are defined separately within their respective domain packages.

---

# Database Engine & ORM Rationale

## Primary Database Engine: PostgreSQL

**PostgreSQL** is selected as the unified relational database engine for EOS.

### Key Rationale
- **ACID Consistency:** Guarantees transactional integrity for financial, billing, and enrollment workflows.
- **High Concurrency:** Multiversion Concurrency Control (MVCC) handles concurrent student learning interactions efficiently.
- **Rich Indexing:** Support for B-tree, Hash, GIN, and GiST indexes.
- **JSONB Capabilities:** Native JSONB column support for flexible metadata without sacrificing relational integrity.
- **Full-Text Search:** Built-in tsvector indexing for course and content searching.
- **Drizzle ORM Synergy:** First-class TypeScript type inference and migration support.

## ORM Tooling: Drizzle ORM

**Drizzle ORM** is selected as the primary query builder and ORM layer.

### Key Rationale
- **SQL-First Philosophy:** Zero runtime abstraction overhead; compiles directly to performant PostgreSQL queries.
- **Full Type Safety:** Automatic inferring of TypeScript select/insert types from schema definitions.
- **Lightweight Footprint:** No heavy Rust binaries or background daemon processes (unlike Prisma).
- **Schema-as-Code:** Pure JavaScript/TypeScript schema files located directly in infrastructure packages.

---

# Database Architecture & Schema Layout

EOS operates on a **Shared Database, Shared Schema** model in v1. Tenant isolation is enforced through relational hierarchy rules and repository scoping.

```text
packages/infrastructure/database/src/

├── client/             # Connection pool initialization
├── schema/             # Bounded context schema declarations
│   ├── identity.js
│   ├── tenant.js
│   ├── organization.js
│   ├── users.js
│   ├── courses.js
│   ├── enrollments.js
│   ├── learning.js
│   ├── assessments.js
│   ├── certificates.js
│   ├── files.js
│   ├── media.js
│   ├── notifications.js
│   ├── billing.js
│   ├── administration.js
│   └── index.js        # Centralized schema export
├── migrations/         # Drizzle Kit generated SQL migrations
├── seed/               # System seeding scripts
├── transactions/       # Transaction helper routines
└── drizzle.config.js   # Drizzle Kit configuration
```

Each bounded context owns its schema definition file inside `packages/infrastructure/database/src/schema/`.

---

# Primary Key Strategy: UUID v7

All business entity tables use **UUID v7** as their primary key format (`id`).

```text
UUID v7 Structure:
┌──────────────────────────────────────┬──────────────────────────────┐
│  Unix Timestamp (48 bits, ms precision)│  Random/Sequence (74 bits)  │
└──────────────────────────────────────┴──────────────────────────────┘
```

### Rationale
- **Time-Ordered Insertion Locality:** Unlike UUID v4 (which causes B-tree index fragmentation), UUID v7 keys are sequential, leading to high-performance B-tree index insertion locality.
- **Native PostgreSQL Storage:** Stored efficiently as 128-bit `uuid` data types.
- **Globally Unique:** Safe for multi-region replication and future offline/client-side ID generation.

---

# Audit Columns

Every business domain table **must** include the following standard audit columns:

```sql
id          UUID PRIMARY KEY,
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by  UUID,
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_by  UUID,
deleted_at  TIMESTAMPTZ,
deleted_by  UUID,
version     INTEGER NOT NULL DEFAULT 1
```

### Purpose
- **Compliance & Auditing:** Full traceability of record creation and modification actors.
- **Optimistic Locking:** The `version` column prevents concurrent lost update anomalies.
- **Soft Deletes:** `deleted_at` and `deleted_by` support data recovery and audit compliance.

> [!NOTE]
> **Exceptions:** Transient infrastructure tables (e.g., sessions, cache entries, OTP tokens, background queue jobs, rate-limit counters) are exempt from business audit columns.

---

# Soft Delete Strategy

Business entities utilize **Soft Deletes** by default.

```text
Record Active:    deleted_at IS NULL
Record Deleted:   deleted_at = '2026-08-31 22:00:00+00'
```

Repositories automatically filter out soft-deleted records (`WHERE deleted_at IS NULL`).

### Hard Delete Exemption List
Hard deletes (`DELETE FROM ...`) are permitted **only** for non-business transient tables:
- User Sessions & Refresh Tokens
- One-Time Passwords (OTPs) & Auth Codes
- Temporary File Upload Staging
- Queue Jobs & Lock Keys
- Rate Limit Counters

---

# Optimistic Locking

Every business entity table includes a `version` column.

### Execution Mechanism
When executing an update command:
```sql
UPDATE courses 
SET title = 'Advanced Math', version = version + 1, updated_at = NOW()
WHERE id = '01917f8a-...' AND version = 1 AND deleted_at IS NULL;
```
If the row count returned is `0`, a concurrent modification occurred, and the repository throws an `OptimisticLockException`.

---

# Foreign Keys & Cascade Policy

All database relationships must be explicitly declared with Foreign Key constraints.

### Constraint Rules
1. **No Orphan Records:** Every child entity must reference a valid parent.
2. **Restrict Deletes on Critical Entities:** Foreign keys to core entities (e.g., `organization_id`, `user_id`) use `ON DELETE RESTRICT` or `ON DELETE NO ACTION`.
3. **Cascade Deletes Only for Owned Sub-Entities:** `ON DELETE CASCADE` is reserved strictly for tightly-bound child records (e.g., deleting a `Course` cascades to its `Lesson` records).

```text
Organization (Parent)
    │ ❌ ON DELETE RESTRICT (Prevents accidental destruction of course history)
    └── Course (Entity)
            │ ✅ ON DELETE CASCADE (Deleting a course cleans up its sub-lessons)
            └── Lesson (Child)
```

---

# Database Naming Conventions

All database identifiers must follow lower `snake_case`.

| Database Object | Naming Pattern | Example |
| :--- | :--- | :--- |
| **Tables** | Plural `snake_case` | `users`, `organizations`, `organization_members`, `courses` |
| **Columns** | Singular `snake_case` | `created_at`, `organization_id`, `published_at` |
| **Primary Key Column** | `id` | `id` |
| **Foreign Key Column** | `<target_entity_singular>_id` | `organization_id`, `course_id`, `lesson_id` |
| **Indexes** | `idx_<table_name>_<column_names>` | `idx_courses_organization_id`, `idx_users_email` |
| **Unique Constraints** | `uq_<table_name>_<column_names>` | `uq_users_email`, `uq_org_members_user_org` |
| **Foreign Key Constraints**| `fk_<source_table>_<target_table>` | `fk_courses_organizations`, `fk_enrollments_users` |

---

# Indexing Strategy

Every table must be properly indexed based on query access patterns:

1. **Primary Key Index:** B-tree index on `id` (Automatic).
2. **Foreign Key Indexes:** Explicit B-tree indexes on all foreign key columns (e.g., `organization_id`).
3. **Soft Delete Filter Indexes:** Partial indexes on active records where appropriate.
4. **Composite Query Indexes:** Composite indexes aligned with high-frequency lookup patterns.

#### Example Composite Index for Course Listing:
```sql
CREATE INDEX idx_courses_org_status_published 
ON courses (organization_id, status, published_at) 
WHERE deleted_at IS NULL;
```

> [!WARNING]
> Avoid over-indexing. Every index adds overhead to `INSERT`, `UPDATE`, and `DELETE` queries. Add indexes based on measured `EXPLAIN ANALYZE` query plans.

---

# Query & Transaction Rules

### Query Principles
- **No `SELECT *`:** Select only required columns in application repositories.
- **Mandatory Pagination:** All list/collection queries must enforce limit/offset or cursor pagination.
- **Explicit Ordering:** List queries must provide deterministic `ORDER BY` clauses.
- **Parameterized Queries:** All inputs must be parameterized via Drizzle ORM to block SQL injection.

### Transaction Rules

> **One Use Case = One Database Transaction**

- Keep database transactions as short as possible.
- **Never** perform HTTP requests, file uploads, or email dispatches inside a transaction block.
- Publish Domain Events only after successful transaction commitment.

---

# System Tables vs. Business Tables

EOS separates core business domain tables from infrastructure management tables.

```text
Database
├── Business Tables (Audited, Soft-deleted)
│   ├── users
│   ├── organizations
│   ├── courses
│   └── enrollments
│
└── System & Infrastructure Tables (Transient or System-managed)
    ├── schema_migrations
    ├── audit_logs
    ├── queue_jobs
    ├── outbox_events
    └── idempotency_keys
```

---

# Schema Migrations & Seeding

## Migrations Tooling: Drizzle Kit
- Schema changes are authored in TypeScript files under `packages/infrastructure/database/src/schema/`.
- Migrations are generated via `pnpm db:generate` into `packages/infrastructure/database/src/migrations/`.

> [!CAUTION]
> **Migration Rule:** Generated migration files are immutable once merged. Never edit historical migration files. Create a new migration file for schema updates.

## Seeding Strategy
- **Development Seed:** Populates local environment with mock tenants, instructors, and courses (`pnpm db:seed`).
- **Production Seed:** Populates system-level roles, permissions, feature flags, and system defaults.

---

# Architectural Decision Records (ADRs)

---

## ADR-004: PostgreSQL as Primary Database Engine

### Status
**Accepted**

### Context
EOS requires a robust, ACID-compliant relational data store capable of supporting multi-tenant isolation, complex analytical joins, and type-safe ORM integration.

### Decision
Adopt **PostgreSQL** paired with **Drizzle ORM**.

### Alternatives Evaluated
- **MySQL / MariaDB:** Less flexible JSON support, weaker index type ecosystem.
- **MongoDB:** Lack of native multi-table transactional consistency for complex enrollment and billing domain workflows.

### Pros
- Enterprise reliability and MVCC performance.
- Native UUID v7 support and rich indexing.
- Seamless Drizzle ORM integration.

---

## ADR-005: UUID v7 Primary Keys

### Status
**Accepted**

### Context
Sequential integer IDs expose business metrics and cause security vulnerabilities. UUID v4 causes severe B-tree index fragmentation.

### Decision
Standardize on **UUID v7** for all primary keys (`id`).

### Pros
- Sequential time-ordering preserves B-tree index locality.
- No public sequence exposure (enumeration attacks blocked).
- Globally unique across distributed regions.

---

## ADR-006: Soft Delete Strategy for Business Entities

### Status
**Accepted**

### Context
Accidental deletion of educational data (courses, student progress, certificates) causes irrecoverable data loss and compliance violations.

### Decision
Implement soft deletes (`deleted_at`, `deleted_by`) for all business domain tables. Restrict hard deletes to transient system tables.

### Pros
- Complete data recovery capability.
- Simplifies historical compliance and audit logging.

---

# Guiding Principle

> **The database is the system of record. Design for correctness, consistency, and maintainability first. Optimize only when real workload measurements justify it.**

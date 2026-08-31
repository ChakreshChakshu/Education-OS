# 05B – Academic Data Model

## Purpose

This document defines the academic domain model for the Education Operating System (EOS).

It establishes how courses are created, versioned, delivered, and consumed while ensuring the platform supports coaching institutes, colleges, universities, corporate learning platforms, and future ERP integrations.

---

# Core Design Principles

- **Organization Owns Content:** Academic assets belong to an Organization within a Tenant.
- **Course Versioning:** Curriculum changes create immutable versions (`CourseVersion`). Existing learners are never disrupted.
- **Offering-Based Enrollment:** Students enroll in specific `CourseOfferings` (batches/terms), not raw courses.
- **Separation of Content vs. Delivery:** Course content (what) is separated from delivery schedule and instruction (how & when).
- **Normalized Architecture:** Structured relational design before denormalizing.
- **File System Integration:** Media and assets reference a centralized `FilesProvider` via `file_id` references.

---

# Academic Domain Overview

```text
Tenant
  │
Organization
  │
Course (What is taught)
  │
CourseVersion (Which curriculum version)
  │
CourseOffering (When, how, and by whom - e.g., Jan 2026 Batch)
  │
Enrollment (Who is learning)
  │
Learning Progress (Lesson completion & history)
```

---

# Entity Relationship Diagram (ERD)

```text
                              ┌──────────────────┐
                              │   Organization   │
                              └────────┬─────────┘
                                       │ 1
                                       ▼ ∞
                              ┌──────────────────┐
                   ┌──────────┤      Course      ├──────────┐
                   │          └────────┬─────────┘          │
                 1 │                   │ 1                  │ 1
                   ▼ ∞                 ▼ ∞                  ▼ ∞
      ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
      │  CourseCategory  │   │  CourseVersion   │   │CoursePrerequisite│
      └──────────────────┘   └────────┬─────────┘   └──────────────────┘
                                      │ 1
                        ┌─────────────┴─────────────┐
                      1 │                           │ 1
                        ▼ ∞                         ▼ ∞
              ┌──────────────────┐        ┌──────────────────┐
              │     Section      │        │  CourseOffering  │
              └────────┬─────────┘        └────────┬─────────┘
                       │ 1                         │ 1
                       ▼ ∞                         ▼ ∞
              ┌──────────────────┐        ┌──────────────────┐
              │      Lesson      │        │ CourseInstructor │
              └──────────────────┘        └──────────────────┘
```

---

# 1. Course Model (`Course`)

Represents the top-level academic product catalog entry.

### Table Schema: `courses`

```sql
CREATE TABLE courses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  category_id       UUID REFERENCES course_categories(id) ON DELETE SET NULL,
  title             VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  short_description TEXT,
  description       TEXT,
  thumbnail_file_id UUID, -- References centralized files table (05F Files & Storage)
  level             VARCHAR(50) DEFAULT 'ALL_LEVELS', -- BEGINNER, INTERMEDIATE, ADVANCED, ALL_LEVELS
  language          VARCHAR(10) DEFAULT 'en',
  visibility        VARCHAR(50) NOT NULL DEFAULT 'PUBLIC', -- PUBLIC, PRIVATE, UNLISTED
  status            VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
  
  -- Audit Columns
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID,
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID,
  version           INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT uq_course_org_slug UNIQUE (organization_id, slug)
);
```

> [!IMPORTANT]
> ### Architectural Refinement: `thumbnail_file_id`
> Rather than storing a raw `thumbnail_url` string directly on the `courses` table, EOS references `thumbnail_file_id` linked to `@eos/infra-storage` (05F – Files & Storage).
> **Benefits:**
> - Centralized file lifecycle & metadata management.
> - Storage provider independence (Cloudflare R2 today, S3/Azure later).
> - Consistent file authorization & asset versioning.

---

# 2. Course Category Model (`CourseCategory`)

Supports hierarchical course classification with unlimited nesting via self-referencing `parent_id`.

### Table Schema: `course_categories`

```sql
CREATE TABLE course_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  parent_id       UUID REFERENCES course_categories(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL,
  description     TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_category_org_slug UNIQUE (organization_id, slug)
);
```

---

# 3. Course Version Model (`CourseVersion`)

Represents an immutable snapshot of course curriculum. Every structural change creates a new version.

### Table Schema: `course_versions`

```sql
CREATE TABLE course_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  course_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  status         VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
  published_at   TIMESTAMPTZ,
  
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID,

  CONSTRAINT uq_course_version_num UNIQUE (course_id, version_number)
);
```

---

# 4. Section Model (`Section`)

Logical structural module within a specific course version (e.g. *"Getting Started"*, *"React Hooks"*).

### Table Schema: `sections`

```sql
CREATE TABLE sections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  course_version_id UUID NOT NULL REFERENCES course_versions(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  display_order     INTEGER NOT NULL DEFAULT 0,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 5. Lesson Model (`Lesson`)

The atomic unit of learning content.

### Table Schema: `lessons`

```sql
CREATE TABLE lessons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  section_id       UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  slug             VARCHAR(255) NOT NULL,
  summary          TEXT,
  content_type     VARCHAR(50) NOT NULL, -- VIDEO, ARTICLE, PDF, ASSIGNMENT, QUIZ, LIVE_SESSION
  duration_seconds INTEGER DEFAULT 0,
  display_order    INTEGER NOT NULL DEFAULT 0,
  is_preview       BOOLEAN NOT NULL DEFAULT FALSE,
  status           VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
  
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 6. Course Offering Model (`CourseOffering`)

Represents a deliverable instance of a course version. **Students enroll in offerings.**

### Table Schema: `course_offerings`

```sql
CREATE TABLE course_offerings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  course_version_id UUID NOT NULL REFERENCES course_versions(id) ON DELETE RESTRICT,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  title             VARCHAR(255) NOT NULL, -- e.g. "React Masterclass - Jan 2026 Batch"
  delivery_mode     VARCHAR(50) NOT NULL DEFAULT 'SELF_PACED', -- SELF_PACED, INSTRUCTOR_LED, HYBRID, LIVE
  start_date        TIMESTAMPTZ,
  end_date          TIMESTAMPTZ,
  enrollment_start  TIMESTAMPTZ,
  enrollment_end    TIMESTAMPTZ,
  capacity          INTEGER, -- NULL = Unlimited
  status            VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, OPEN, RUNNING, COMPLETED, ARCHIVED
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 7. Course Instructor Model (`CourseInstructor`)

Maps instructors to specific course offerings.

### Table Schema: `course_instructors`

```sql
CREATE TABLE course_instructors (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role               VARCHAR(50) NOT NULL DEFAULT 'LEAD_INSTRUCTOR', -- LEAD_INSTRUCTOR, ASSISTANT, GUEST
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_offering_instructor UNIQUE (course_offering_id, user_id)
);
```

---

# 8. Course Prerequisites & Tags

### Table Schema: `course_prerequisites`
```sql
CREATE TABLE course_prerequisites (
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  required_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  PRIMARY KEY (course_id, required_course_id)
);
```

---

# Course Lifecycle & Versioning Workflow

```text
Draft Course  ──>  Create Version 1  ──>  Add Sections & Lessons  ──>  Publish Version 1
                                                                              │
                                                                              ▼
                                                                     Create Offering (Jan Batch)
                                                                              │
                                                                              ▼
                                                                     Students Enroll & Learn
```

### Real-World Versioning Example

```text
Course: React Masterclass
  ├── Version 1 (Published Jan 2026)
  │     └── January Batch Offering  ──>  Enrolled Students study Version 1
  │
  └── Version 2 (Updated March 2026 with React 19)
        └── March Batch Offering    ──>  New Students study Version 2
```

- Students in the **January Batch** continue on **Version 1** without disruption.
- Students in the **March Batch** enroll in **Version 2**.

---

# Indexing Recommendations

```sql
-- Course Indexes
CREATE INDEX idx_courses_org_id ON courses(organization_id);
CREATE INDEX idx_courses_category_id ON courses(category_id);
CREATE INDEX idx_courses_status_visibility ON courses(status, visibility);

-- Version & Section Indexes
CREATE INDEX idx_course_versions_course_id ON course_versions(course_id);
CREATE INDEX idx_sections_version_order ON sections(course_version_id, display_order);
CREATE INDEX idx_lessons_section_order ON lessons(section_id, display_order);

-- Offering Indexes
CREATE INDEX idx_offerings_org_status ON course_offerings(organization_id, status);
CREATE INDEX idx_offerings_version_id ON course_offerings(course_version_id);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-009: Immutable Course Versioning

### Status
**Accepted**

### Context
Modifying curriculum content in-place breaks existing student progress, invalidates completed certificates, and causes analytical reporting errors.

### Decision
Introduce immutable `CourseVersion` entities. Published versions are locked against structural edits. Any curriculum updates require creating a new `CourseVersion`.

### Benefits
- Safe, non-disruptive content updates.
- Guaranteed stability for student progress and certificates.
- Reliable historical analytics.

---

## ADR-010: Course Offerings for Delivery Isolation

### Status
**Accepted**

### Context
A single course may run across multiple cohorts, semesters, or delivery modes (self-paced vs. live cohort) with different schedules and instructors.

### Decision
Introduce `CourseOffering` as the deliverable instance. Students enroll into specific offerings rather than raw course templates.

### Benefits
- Supports cohort batches, academic terms, and live masterclasses seamlessly.
- Enables distinct pricing, scheduling, and capacity controls per offering.

---

# Guiding Principle

> **A Course defines WHAT is taught.**  
> **A CourseVersion defines WHICH CONTENT is taught.**  
> **A CourseOffering defines HOW, WHEN, and BY WHOM it is taught.**  
> **An Enrollment defines WHO is learning it.**

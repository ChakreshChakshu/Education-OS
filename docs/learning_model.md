# 05C – Learning Model

## Purpose

This document defines the learning domain model for the Education Operating System (EOS).

It describes how learners enroll in course offerings, how lesson progress and resume markers are tracked, and how study sessions, bookmarks, notes, and course completion are managed.

---

# Core Design Principles

- **Offerings-Based Enrollment:** Students enroll in `CourseOfferings`, not raw course templates.
- **Lesson-Level Tracking:** Progress is tracked atomically per lesson (`LessonProgress`).
- **Derived Completion (Source of Truth):** Course completion is derived dynamically from `LessonProgress`. The `completion_percentage` on `Enrollment` acts as an asynchronously updated read cache.
- **Immutable Enrollment History:** Every enrollment is an immutable record. Re-enrolling creates a distinct enrollment record without polluting historical data.
- **Interruptible Resume Learning:** Video/audio playback positions are saved continuously (`last_position_seconds`).
- **Analytics & Engagement:** Activity is captured via `LearningSession` records for streaks and engagement tracking.

---

# Learning Domain Overview

```text
CourseOffering
      │
      ▼
Enrollment
      │
 ┌────┴──────────────────────────┐
 │                               │
 ▼                               ▼
LessonProgress            LearningSession
(Source of Truth)         (Analytics & Streaks)
 │
 ├─────────────────────────┐
 ▼                         ▼
LessonBookmark            LessonNote
```

---

# Entity Relationship Diagram (ERD)

```text
                            ┌──────────────────┐
                            │  CourseOffering  │
                            └────────┬─────────┘
                                     │ 1
                                     ▼ ∞
                            ┌──────────────────┐
                 ┌──────────┤    Enrollment    ├──────────┐
                 │          └────────┬─────────┘          │
               1 │                   │ 1                  │ 1
                 ▼ ∞                 ▼ ∞                  ▼ ∞
    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
    │  LessonProgress  │    │ LearningSession  │    │    Certificate   │
    └────────┬─────────┘    └──────────────────┘    └──────────────────┘
             │
      ┌──────┴──────┐
    1 │           1 │
      ▼ ∞           ▼ ∞
┌──────────┐    ┌──────────┐
│ Bookmark │    │   Note   │
└──────────┘    └──────────┘
```

---

# 1. Enrollment Model (`Enrollment`)

Represents a student's participation in a specific course offering.

### Table Schema: `enrollments`

```sql
CREATE TABLE enrollments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  offering_id           UUID NOT NULL REFERENCES course_offerings(id) ON DELETE RESTRICT,
  student_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status                VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- PENDING, ACTIVE, COMPLETED, CANCELLED, DROPPED, EXPIRED
  enrolled_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  completion_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Cached Read Projection
  certificate_issued    BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Audit Columns
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_student_offering UNIQUE (student_id, offering_id)
);
```

> [!IMPORTANT]
> ### Architectural Pattern: Cached Completion Percentage
> The `completion_percentage` column on `enrollments` is **NOT** the ultimate source of truth.
> - **Source of Truth:** Aggregate query over `lesson_progress` records.
> - **Cached Projection:** `enrollments.completion_percentage` is updated asynchronously whenever a lesson is completed.
> 
> **Benefits:**
> - **Fast Dashboard Queries:** UI loads instant progress percentages without running heavy `COUNT(*)` aggregate joins over thousands of lessons.
> - **Guaranteed Accuracy:** Can be recalculated or audited at any time from underlying `lesson_progress` rows.

---

# 2. Lesson Progress Model (`LessonProgress`)

Atomic progress record for every lesson attempted by an enrolled student.

### Table Schema: `lesson_progress`

```sql
CREATE TABLE lesson_progress (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  enrollment_id         UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id             UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  status                VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED
  progress_percent      NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  watch_time_seconds    INTEGER NOT NULL DEFAULT 0,
  completed_at          TIMESTAMPTZ,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  last_accessed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_enrollment_lesson UNIQUE (enrollment_id, lesson_id)
);
```

---

# 3. Learning Session Model (`LearningSession`)

Tracks individual study sessions for engagement analytics, learning streaks, and time spent metrics.

### Table Schema: `learning_sessions`

```sql
CREATE TABLE learning_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  enrollment_id    UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  device           VARCHAR(100), -- WEB_CHROME, MOBILE_IOS, MOBILE_ANDROID
  ip_address       VARCHAR(45),
  
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 4. Lesson Bookmarks & Private Notes

### Table Schema: `lesson_bookmarks`
```sql
CREATE TABLE lesson_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_student_lesson_bookmark UNIQUE (student_id, lesson_id)
);
```

### Table Schema: `lesson_notes`
```sql
CREATE TABLE lesson_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# Dynamic Progress Calculation

### Formula
$$\text{Progress \%} = \frac{\text{Count of Completed Lessons}}{\text{Total Required Lessons}} \times 100$$

### Calculation Flow
```text
Student completes Lesson
         │
         ▼
UPDATE lesson_progress SET status = 'COMPLETED', completed_at = NOW()
         │
         ▼
Dispatch DomainEvent: LessonCompletedEvent
         │
         ▼
Async Worker recalculates progress percentage
         │
         ▼
UPDATE enrollments SET completion_percentage = 70.00
```

---

# Resume Learning Mechanism

When a student exits a 20-minute video at minute `13:42`, the player sends heartbeat pulses updating `last_position_seconds = 822`.

```text
Player Exit (13:42)  ──>  last_position_seconds = 822
                                    │
                                    ▼
Player Resume  ──────────>  Fetch last_position_seconds (822)  ──>  Seek to 13:42
```

---

# Learning Lifecycle Timeline

```text
Enroll in Offering  ──>  Start First Lesson  ──>  Continuous Heartbeats  ──>  Lesson Marked Completed
                                                                                    │
                                                                                    ▼
Certificate Issued  <──  Enrollment Marked Completed  <──  100% Progress Calculated
```

---

# Recommended Indexes

```sql
-- Enrollment Indexes
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_offering ON enrollments(offering_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Lesson Progress Indexes
CREATE INDEX idx_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_progress_status ON lesson_progress(status);

-- Learning Session Indexes
CREATE INDEX idx_sessions_enrollment_start ON learning_sessions(enrollment_id, started_at);

-- Notes & Bookmarks Indexes
CREATE INDEX idx_notes_student_lesson ON lesson_notes(student_id, lesson_id);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-011: Lesson-Level Atomic Progress Tracking

### Status
**Accepted**

### Context
High-resolution progress tracking is required to support video resume points, interactive quizzes, streak analytics, and mobile offline synchronization.

### Decision
Track progress atomically at the `LessonProgress` level. Do not store only top-level course percentages.

### Benefits
- Seamless resume-playback experience across web and mobile.
- High-fidelity learning analytics.
- Reliable completion triggers.

---

## ADR-012: Immutable Enrollment History per Offering

### Status
**Accepted**

### Context
Learners may retake courses across multiple academic terms or years. Overwriting previous enrollment data destroys historical record accuracy.

### Decision
Treat each enrollment in a `CourseOffering` as an immutable record. Re-enrolling in a new offering creates a fresh `Enrollment` record.

### Benefits
- Preserves accurate academic transcripts.
- Clean separation between past and present attempts.

---

# Guiding Principle

> **Learning is tied to an enrollment, progress is tracked atomically per lesson, and course completion is derived from learner activity rather than manually maintained.**

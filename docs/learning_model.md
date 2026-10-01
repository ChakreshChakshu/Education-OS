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
CREATE INDEX idx_notes_student_id ON lesson_notes(student_user_id);
CREATE INDEX idx_notes_module_id ON lesson_notes(lesson_module_id);
CREATE UNIQUE INDEX uq_lesson_notes_student_module ON lesson_notes(student_user_id, lesson_module_id);
```

---

# 4. Student Notes Model (`LessonNote`)

Represents rich markdown notes authored by a student during lesson video or document study. Notes are persisted in Neon PostgreSQL with native `ON CONFLICT` atomic upserts and debounced synchronization.

### Table Schema: `lesson_notes`

```sql
CREATE TABLE lesson_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_module_id  VARCHAR(255) NOT NULL,
  content           TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_lesson_notes_student_module UNIQUE (student_user_id, lesson_module_id)
);
```

### Real-Time Autosave & Cloud Sync Architecture:
```text
Browser Keystroke (800ms Debounce)
         │
         ▼
Write to localStorage Buffer (Instant Offline Continuity)
         │
         ▼
PUT /api/v1/internal/learning/lessons/:id/notes
         │
         ▼
SaveLessonNoteUseCase ──> DrizzleLessonNoteRepository
         │
         ▼
PostgreSQL: INSERT INTO lesson_notes (...)
            ON CONFLICT (student_user_id, lesson_module_id)
            DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
```

# 5. Student Progress Synchronization & Completion Engine

Tracks individual student completion status across all curriculum module formats (videos, documents, assessments) persisted in Neon PostgreSQL.

### Table Schema: `student_progress`

```sql
CREATE TABLE student_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_module_id  VARCHAR(255) NOT NULL,
  batch_id          UUID REFERENCES batches(id) ON DELETE SET NULL,
  status            VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- IN_PROGRESS, COMPLETED
  completed_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_student_lesson_progress UNIQUE (student_user_id, lesson_module_id)
);
```

### Automatic Completion Triggers

The Classroom Player (`apps/web/app/dashboard/courses/[id]/lesson/[lessonId]/page.js`) triggers `ApiClient.completeLesson(lessonId, batchId)` via `POST /api/v1/internal/learning/lessons/complete` on:
1. **Video 90% Threshold:** Video watch time passes 90% of duration during playback (`timeupdate`).
2. **Video End:** Player fires native `ended` event.
3. **Document / PDF Completion:** Student clicks "Mark as Read & Continue" action button.
4. **Quiz Mastery:** Student answers assessment questions and passes passing grade (`POST /api/v1/internal/learning/quizzes/submit`).

### Live Course Progress Calculation Flow:
```text
Classroom Lesson Action (90% video, document read, quiz pass)
              │
              ▼
POST /api/v1/internal/learning/lessons/complete
              │
              ▼
Neon DB: UPSERT student_progress (status = 'COMPLETED')
              │
              ▼
GET /api/v1/internal/learning/courses/:courseId/progress
              │
              ├── Computes completedModules / totalModules * 100
              └── Returns list of completedLessonModuleIds
              │
              ▼
Classroom Sidebar & Course Builder Progress Rings Update in Real-Time
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

## ADR-013: Web LMS Player & Real-time Progress Persistence

### Status
**Accepted & Implemented**

### Context
Students need continuous feedback on lesson progress, adaptive video streaming with quality adjustments, in-browser notes that persist across sessions, and instant knowledge assessment evaluations with database-backed completion recording.

### Implementation Details
1. **Interactive Classroom Player (`HlsVideoPlayer.jsx`)**:
   - Supports HTTP Live Streaming (HLS) multi-bitrate manifests with dynamic variant switching (`Auto`, `1080p`, `720p`, `360p`).
   - Chapter checkpoints with visual time markers and seek triggers.
   - Autosaved student notes persisted locally to `localStorage` (`eos_notes_<lessonId>`).
2. **Persistence Flow**:
   - Marking a lesson complete triggers `ApiClient.completeLesson({ studentUserId, lessonModuleId, batchId })` $\rightarrow$ `POST /api/v1/internal/learning/lessons/complete` $\rightarrow$ inserts or updates row in `student_progress` table.
   - Submitting a quiz assessment triggers `ApiClient.submitQuiz({ studentUserId, lessonModuleId, score, passingScore })` $\rightarrow$ `POST /api/v1/internal/learning/quizzes/submit` $\rightarrow$ evaluates score and persists to `quiz_submissions` table.

---

## ADR-014: Classroom Timeline Drawer & Video Timestamp Bookmarks

### Status
**Accepted & Implemented**

### Context
In video-heavy asynchronous education, students need to highlight key concepts at exact video timestamps, jot quick reflections, and review an interactive milestone timeline without losing playback focus.

### Schema: `lesson_bookmarks`
```sql
CREATE TABLE lesson_bookmarks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id         UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_module_id  VARCHAR(255) NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  title             VARCHAR(255) NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_bookmarks_student_lesson ON lesson_bookmarks (student_user_id, lesson_module_id);
CREATE INDEX idx_lesson_bookmarks_tenant ON lesson_bookmarks (tenant_id);
```

### Implementation Details
1. **Quick Action Bookmark Bar**: Shows live video time (`Clock`) and `+ Bookmark Moment` trigger.
2. **Workspace Bookmarks Tab**: Dedicated tab alongside Lesson Syllabus, Cloud Notes, and Discussion Q&A with jump-to-timestamp and deletion controls.
3. **Dual-Mode Interactive Right Drawer**: Toggles between `Syllabus Navigation` and `Timeline Drawer`. The Timeline Drawer renders an interactive vertical timeline combining lesson milestones and student bookmarks, enabling instantaneous seeking to lecture highlights.

---

# Guiding Principle

> **Learning is tied to an enrollment, progress is tracked atomically per lesson, and course completion is derived from learner activity rather than manually maintained.**



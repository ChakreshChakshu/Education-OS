# 05D – Assessment Model

## Purpose

This document defines the assessment domain model for the Education Operating System (EOS).

It supports quizzes, examinations, assignments, practical evaluations, grading workflows, instructor feedback, and future AI-powered grading while preserving 100% historical accuracy through immutable versioning and question snapshotting.

---

# Core Design Principles

- **Versioned Assessments:** Every content edit creates a new `AssessmentVersion`.
- **Immutable Attempts:** Attempts (`AssessmentAttempt`) are frozen once submitted.
- **Question & Answer Snapshots:** `AttemptAnswer` snapshots question text, choices, and correct answers at submission time, ensuring future question edits never corrupt historical grades.
- **Reproducible Grading:** Auto-grading rules produce deterministic results.
- **Hybrid Grading:** Automatic grading for objective questions paired with manual instructor grading for subjective questions.
- **High-Concurrency Support:** Optimized schema designed for simultaneous test-taking across thousands of students.

---

# Assessment Domain Overview

```text
               ┌─────────────────────────────────┐
               │           Assessment            │
               └────────────────┬────────────────┘
                                │ (Polymorphic Attachment)
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  CourseVersion              Lesson               CourseOffering (Future)
  (Final Exams)          (Lesson Quizzes)          (Batch Tests)
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                   AssessmentVersion (Immutable)
                                │
                   ┌────────────┴────────────┐
                   ▼                         ▼
               Question              AssessmentAttempt
                   │                         │
                   ▼                         ▼
            QuestionOption             AttemptAnswer
```

---

# Entity Relationship Diagram (ERD)

```text
┌──────────────┐      ┌──────────────┐      ┌────────────────┐
│CourseVersion │      │    Lesson    │      │ CourseOffering │
└──────┬───────┘      └──────┬───────┘      └───────┬────────┘
       │ 1                   │ 1                    │ 1
       └──────────────┐      │      ┌───────────────┘
                      ▼ ∞    ▼ ∞    ▼ ∞
                   ┌──────────────────┐
                   │    Assessment    │
                   └────────┬─────────┘
                            │ 1
                            ▼ ∞
                   ┌──────────────────┐
        ┌──────────┤AssessmentVersion ├──────────┐
        │          └────────┬─────────┘          │
      1 │                   │ 1                  │ 1
        ▼ ∞                 ▼ ∞                  ▼ ∞
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│     Question     │  │AssessmentAttempt │  │ Certificate Rule │
└────────┬─────────┘  └────────┬─────────┘  └──────────────────┘
         │ 1                   │ 1
         ▼ ∞                   ▼ ∞
┌──────────────────┐  ┌──────────────────┐
│  QuestionOption  │  │  AttemptAnswer   │
└──────────────────┘  └──────────────────┘
```

---

# 1. Assessment Model (`Assessment`)

Top-level assessment definition with **polymorphic attachment capability**.

### Table Schema: `assessments`

```sql
CREATE TABLE assessments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  
  -- Polymorphic Attachment Target
  target_type        VARCHAR(50) NOT NULL DEFAULT 'COURSE_VERSION', -- COURSE_VERSION, LESSON, COURSE_OFFERING, SECTION
  course_version_id  UUID REFERENCES course_versions(id) ON DELETE CASCADE,
  lesson_id          UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
  
  title              VARCHAR(255) NOT NULL,
  description        TEXT,
  assessment_type    VARCHAR(50) NOT NULL DEFAULT 'QUIZ', -- QUIZ, ASSIGNMENT, PRACTICAL, CODING, EXAM, SURVEY
  passing_score      NUMERIC(5, 2) NOT NULL DEFAULT 70.00,
  max_attempts       INTEGER DEFAULT 1, -- NULL = Unlimited
  time_limit_minutes INTEGER, -- NULL = Unlimited
  shuffle_questions  BOOLEAN NOT NULL DEFAULT FALSE,
  shuffle_options    BOOLEAN NOT NULL DEFAULT FALSE,
  status             VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
  
  -- Audit Columns
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID,
  deleted_at         TIMESTAMPTZ,
  deleted_by         UUID,
  version            INTEGER NOT NULL DEFAULT 1
);
```

> [!IMPORTANT]
> ### Architectural Advantage: Polymorphic Attachment
> Instead of binding assessments exclusively to entire course versions, EOS supports polymorphic targeting:
> - **Lesson Quizzes:** Attached directly to a `Lesson` (`lesson_id`).
> - **Section/Module Tests:** Attached to a `Section`.
> - **Final Course Exams:** Attached to a `CourseVersion` (`course_version_id`).
> - **Batch-Specific Quizzes:** Attached to a specific `CourseOffering` (`course_offering_id`).
> 
> **Benefits:** Maximizes code reusability across universities, K-12, corporate training, and coaching institutes without model duplication.

---

# 2. Assessment Version Model (`AssessmentVersion`)

Immutable version boundary for an assessment.

### Table Schema: `assessment_versions`

```sql
CREATE TABLE assessment_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  published_at   TIMESTAMPTZ,
  
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_assessment_version_num UNIQUE (assessment_id, version_number)
);
```

---

# 3. Question & Option Models (`Question`, `QuestionOption`)

### Table Schema: `questions`
```sql
CREATE TABLE questions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  question_type         VARCHAR(50) NOT NULL, -- SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER, NUMERIC, FILE_UPLOAD, CODING
  title                 TEXT NOT NULL,
  description           TEXT,
  points                NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
  display_order         INTEGER NOT NULL DEFAULT 0,
  explanation           TEXT,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table Schema: `question_options`
```sql
CREATE TABLE question_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  is_correct    BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0
);
```

---

# 4. Assessment Attempt Model (`AssessmentAttempt`)

Represents a single test submission by an enrolled student.

### Table Schema: `assessment_attempts`

```sql
CREATE TABLE assessment_attempts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE RESTRICT,
  enrollment_id         UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  attempt_number        INTEGER NOT NULL DEFAULT 1,
  status                VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_PROGRESS, SUBMITTED, GRADED, CANCELLED
  score                 NUMERIC(6, 2),
  percentage            NUMERIC(5, 2),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at          TIMESTAMPTZ,
  graded_at             TIMESTAMPTZ,
  graded_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_enrollment_version_attempt UNIQUE (enrollment_id, assessment_version_id, attempt_number)
);
```

---

# 5. Attempt Answer Model (`AttemptAnswer`)

Stores the student's submission paired with immutable **JSONB Snapshots** of the question and options at the moment of attempt creation.

### Table Schema: `attempt_answers`

```sql
CREATE TABLE attempt_answers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  attempt_id              UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id             UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  
  -- Immutable Snapshots
  question_snapshot       JSONB NOT NULL, -- Text, points, options at time of exam
  selected_answer         JSONB NOT NULL, -- Option IDs or text response
  correct_answer_snapshot JSONB NOT NULL, -- Correct Option IDs or rubric key
  
  is_correct              BOOLEAN,
  points_awarded          NUMERIC(5, 2) DEFAULT 0.00,
  feedback                TEXT,
  graded_at               TIMESTAMPTZ,

  CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);
```

> [!IMPORTANT]
> ### Architectural Pattern: Question & Answer Snapshots
> Even if an instructor later edits a question text or changes options on an assessment, historical `attempt_answers` rows contain the exact `question_snapshot` and `correct_answer_snapshot` used when the student took the exam.
> **Benefits:**
> - **Legal Defensibility:** Preserves exact exam conditions for academic dispute resolution.
> - **Zero Side Effects:** Editing a published course version or question never alters historical grades.

---

# Assessment Lifecycle & Grading Flow

```text
Start Attempt  ──>  Generate Attempt & Snapshot Questions  ──>  Student Answers  ──>  Submit Attempt
                                                                                           │
                                                                                           ▼
Pass Status Updated  <──  Final Score Calculated  <──  Manual Instructor Review  <──  Auto-Grade Objective Items
```

### Passing Condition Rule
$$\text{Assessment Passed} \iff \text{percentage} \ge \text{passing\_score}$$

---

# Recommended Indexes

```sql
-- Assessment Indexes
CREATE INDEX idx_assessments_course_version ON assessments(course_version_id);
CREATE INDEX idx_assessments_status ON assessments(status);

-- Attempt Indexes
CREATE INDEX idx_attempts_enrollment ON assessment_attempts(enrollment_id);
CREATE INDEX idx_attempts_version_status ON assessment_attempts(assessment_version_id, status);

-- Answer Indexes
CREATE INDEX idx_answers_attempt ON attempt_answers(attempt_id);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-013: Immutable Assessment Versioning

### Status
**Accepted**

### Context
Modifying an active quiz while students are taking it causes invalid grading and analytical corruptions.

### Decision
Introduce `AssessmentVersion`. Published assessment versions are locked. Editing creates a new version.

### Benefits
- Stable test-taking conditions.
- Reliable historical reporting.

---

## ADR-014: Question & Option Snapshotting

### Status
**Accepted**

### Context
Question text and correct options may evolve over time. Historical student submissions must retain the original question state.

### Decision
Store `question_snapshot` and `correct_answer_snapshot` as JSONB inside `attempt_answers`.

### Benefits
- Historical integrity and auditability.
- Safe content refactoring.

---

## ADR-015: Independent Assessment Attempt Model

### Status
**Accepted**

### Context
Courses may allow multiple test attempts. Each attempt must maintain independent timing, score, and answer data.

### Decision
Represent every submission as a distinct `AssessmentAttempt` entity.

### Benefits
- Flexible retake support.
- Complete analytics on learning improvements across attempts.

---

# Guiding Principle

> **Assessments are immutable academic records. Every learner attempt represents a historical fact that must remain reproducible regardless of future content changes.**

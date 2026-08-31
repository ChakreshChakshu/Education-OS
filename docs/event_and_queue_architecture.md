# 09 – Event & Queue Architecture

## Purpose

This document defines the Event-Driven Architecture and Background Job Processing strategy for the Education Operating System (EOS).

It establishes how business domain events are reliably captured, persisted within transaction boundaries, and processed asynchronously via background workers, guaranteeing zero event loss and seamless scalability.

---

# Core Design Principles

- **Transactional Outbox Pattern:** Atomic persistence of business data and outbox events within a single database transaction.
- **Domain Events vs. Background Jobs:** Clear separation between business facts (`EnrollmentCreated`) and executable background tasks (`SendWelcomeEmail`).
- **Provider-Agnostic Abstraction:** Queue drivers decoupled behind a `QueueProvider` interface (PostgreSQL initially; SQS, RabbitMQ, or Redis later).
- **At-Least-Once Delivery:** Guaranteed event dispatch with idempotent handlers.
- **Eventual Consistency for Side Effects:** Non-blocking side effects (PDF generation, notifications, analytics) executed asynchronously.
- **Dead Letter Queue (DLQ):** Exhausted job failures isolated for manual inspection.

---

# High-Level Architecture

```text
               Application Use Case Command
                             │
                             ▼
              BEGIN DATABASE TRANSACTION
              ├── Mutate Business Aggregates (e.g. Enrollments)
              └── Insert Outbox Event Record (outbox_events)
              COMMIT DATABASE TRANSACTION
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
In-Process Dispatcher                     Outbox Worker
(Fast Synchronous Handlers)               (Polls outbox_events)
                                                 │
                                                 ▼
                                        Enqueue Background Job
                                          (QueueProvider)
                                                 │
                                                 ▼
                                         Background Worker
                                         (apps/worker Process)
```

---

# Domain Events vs. Background Jobs

| Concept | Domain Event | Background Job |
| :--- | :--- | :--- |
| **Definition** | An immutable fact that occurred in the business domain. | A specific executable task to be performed asynchronously. |
| **Naming** | Past Tense (e.g., `EnrollmentCreated`, `CoursePublished`). | Imperative (e.g., `SendWelcomeEmail`, `TranscodeVideo`). |
| **Target** | Broadcast to zero or more subscriber handlers. | Assigned to a specific queue worker handler. |
| **Lifecycle** | Persisted once in `outbox_events` and dispatched. | Managed in `jobs` (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `DLQ`). |

---

# Transactional Outbox Pattern

Without an outbox pattern, publishing an event to a remote queue after a database commit introduces dual-write failures (if the network or app crashes between the DB commit and queue publish, events are lost forever).

EOS resolves this by writing the event to `outbox_events` **inside the same database transaction**:

```sql
BEGIN;
  INSERT INTO enrollments (id, offering_id, student_id, status) VALUES ($1, $2, $3, 'ACTIVE');
  INSERT INTO outbox_events (id, event_name, aggregate_type, aggregate_id, payload) 
  VALUES ($4, 'EnrollmentCreated', 'Enrollment', $1, '{"offering_id": "...", "student_id": "..."}');
COMMIT;
```

---

# 1. Outbox Event Table (`outbox_events`)

### Table Schema: `outbox_events`

```sql
CREATE TABLE outbox_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  event_name     VARCHAR(100) NOT NULL, -- Past Tense: EnrollmentCreated
  aggregate_type VARCHAR(100) NOT NULL, -- Enrollment, Course, User
  aggregate_id   UUID NOT NULL,
  payload        JSONB NOT NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, DISPATCHED, FAILED
  attempts       INTEGER NOT NULL DEFAULT 0,
  last_error     TEXT,
  processed_at   TIMESTAMPTZ,
  
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 2. Jobs Table (`jobs`)

### Table Schema: `jobs`

```sql
CREATE TABLE jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  job_name     VARCHAR(100) NOT NULL, -- Imperative: SendWelcomeEmail
  queue_name   VARCHAR(50) NOT NULL DEFAULT 'default',
  payload      JSONB NOT NULL,
  status       VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, DEAD_LETTER
  priority     INTEGER NOT NULL DEFAULT 0,
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at    TIMESTAMPTZ,
  last_error   TEXT,
  
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# Exponential Backoff & Retry Pipeline

When a background job throws an unhandled exception, it moves through exponential backoff retries:

```text
Attempt 1 (Immediate) ──> Failed ──> Delay 30s ──> Attempt 2 ──> Failed ──> Delay 2m ──> Attempt 3
                                                                                            │
                                                                                            ▼
Dead Letter Queue (DLQ)  <──  Exhausted (5 Attempts)  <──  Delay 30m  <──  Attempt 4
```

---

# Background Worker Responsibilities (`apps/worker`)

Background workers run as dedicated, independent Node.js OS processes:

```text
apps/worker
├── Polling Outbox Events & Dispatching
├── Video FFmpeg HLS Transcoding & Poster Generation
├── PDF Certificate & Transcript Generation
├── Email & WhatsApp Notification Sending
├── Nightly Analytics Rollups & Soft-Delete File Purging
```

---

# QueueProvider Abstraction Interface

Domain modules never depend on PostgreSQL or Redis queue packages directly. All jobs interact with `QueueProvider`:

```javascript
class QueueProvider {
  async enqueue(jobName, payload, options = {}) {}
  async dequeue(queueName, limit = 1) {}
  async ack(jobId) {}
  async retry(jobId, delaySeconds) {}
  async cancel(jobId) {}
  async moveToDeadLetter(jobId, error) {}
}
```

---

# Recommended Indexes

```sql
-- Outbox Indexes
CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at);

-- Jobs Indexes
CREATE INDEX idx_jobs_status_available ON jobs(status, available_at, priority DESC);
CREATE INDEX idx_jobs_queue_name ON jobs(queue_name);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-031: In-Process Synchronous Event Dispatcher

### Status
**Accepted**

### Context
Certain internal side effects inside a modular monolith require low-latency execution without network overhead.

### Decision
Provide an in-process event bus for synchronous, in-memory event handlers within the same process.

### Benefits
- Extremely fast execution with zero network latency.
- Easy local debugging.

---

## ADR-032: Transactional Outbox Pattern

### Status
**Accepted**

### Context
External queue systems cannot participate in relational database transactions. Network failures cause lost events or inconsistent states.

### Decision
Persist events to `outbox_events` within the database transaction boundary.

### Benefits
- Guaranteed event delivery with zero lost business events.
- Seamless future migration to external message brokers (SQS, RabbitMQ).

---

## ADR-033: PostgreSQL-Backed Queue Driver

### Status
**Accepted**

### Context
Introducing Redis or RabbitMQ infrastructure on day one adds operational complexity for simple deployments.

### Decision
Implement `PostgresQueueDriver` as the default `QueueProvider` implementation.

### Benefits
- Zero additional infrastructure dependencies in v1.
- Operates on existing transactional PostgreSQL database.

---

## ADR-034: Separation of Events and Jobs

### Status
**Accepted**

### Context
Blending domain event history with worker job execution states creates cluttered schemas and fragile retry logic.

### Decision
Maintain separate `outbox_events` (immutable event log) and `jobs` (transient task state machine) tables.

### Benefits
- Clean separation of concerns.
- Independent monitoring, retention, and scaling rules for events vs. worker jobs.

---

# Guiding Principle

> **Domain Events describe WHAT HAPPENED. Jobs describe WHAT NEEDS TO BE DONE. Domain Events are persisted reliably through the Transactional Outbox Pattern, while long-running work is executed asynchronously by background workers through a provider-agnostic queue. This architecture provides reliability today and a clear migration path to distributed messaging in the future without changing business logic.**

# Education Operating System (EOS) - Work Division & Ownership Guide

This document defines the ownership, task breakdown, and collaboration workflow between **Chakresh** and **Adarsh** for the development of the Education Operating System (EOS).

---

## 1. Responsibilities Overview

| Area | Chakresh | Adarsh |
| :--- | :--- | :--- |
| **Architecture & Core** | System architecture, Clean Architecture enforcement, DDD aggregates | Module integration, presentation-layer wiring |
| **Security & Auth** | JWT rotation, multi-tenant isolation, RBAC policies | Protected route integration, client session handling |
| **Infrastructure & Workers** | Outbox pattern, queue engine, video HLS transcoding | Notification delivery adapters, worker job handlers |
| **Database** | Core schema design, Drizzle migrations, transaction isolation | Entity query helpers, pagination, seed scripts |
| **Backend API (`apps/api`)** | Architecture bootstrap, DI container, core domain endpoints | REST CRUD controllers, query filtering, Zod schemas |
| **Frontend (`apps/web`)** | Architecture foundations, state primitives, layout shells | Feature UI pages, forms, media players, interactive components |
| **Quality & Delivery** | Architecture review, CI gates, system integration tests | Unit tests, endpoint integration tests, API doc updates |

---

## 2. Chakresh — Scope & Ownership

### 2.1 Core Architecture & System Integrity
- Maintain DDD boundaries across `packages/domains/*` and enforce Clean Architecture layering.
- Manage dependency cruiser rules (`.dependency-cruiser.js`) to block circular or illegal cross-layer imports.
- Oversee Fastify DI container bootstrap (`apps/api/src/bootstrap/`).
- Define contracts, DTOs, and domain event interfaces in `packages/contracts/`.

### 2.2 Security & Multi-Tenancy
- Harden tenant isolation across all database queries and repository implementations.
- Maintain auth middleware (`authenticateJWT`, `authorize(permission)`), cookie security, and CSRF protection.
- Guard role-based access control (RBAC) and permission evaluation engines.

### 2.3 Transactional Outbox & Background Processing
- Build out PostgreSQL Transactional Outbox table and event publishing triggers.
- Scaffold queue consumers and job scheduling engine in `apps/worker`.
- Implement idempotent job handling and retry/dead-letter strategies.

### 2.4 Video Transcoding Pipeline
- Implement upload confirmation event triggers for media assets.
- Build FFmpeg worker pipeline: source download $\rightarrow$ multi-bitrate HLS segmentation (360p, 720p, 1080p, `master.m3u8`) $\rightarrow$ upload to Cloudflare R2 / local storage.
- Manage video track entities and database metadata updates.

### 2.5 Database & Performance
- Design schemas, indexes, and migrations for all new domain aggregates.
- Enforce the "One Use Case = One Database Transaction" rule across repositories.
- Benchmark and optimize complex queries and concurrency locks.

---

## 3. Adarsh — Scope & Ownership

### 3.1 Frontend Development (`apps/web`)
- **Student Classroom & Player**:
  - Custom video player UI controls (playback speed, captions, chapter markers).
  - Interactive quiz evaluation screen and progress checkpoints.
  - Student notes and bookmarks sidebar drawer.
- **Course & Content Management**:
  - Course catalog listing, filtering, search, and detail screens.
  - Course curriculum module editor and batch assignment interface.
- **Settings & Profile**:
  - User profile settings, password update, and organization configuration forms.
  - Form validation handling with React Hook Form and Zod.
- **Design System & UX Polish**:
  - Reusable UI elements, modal dialogs, slide-overs, and loading skeletons.
  - Responsive layout adjustments and error boundaries.

### 3.2 Standard REST Endpoints (`apps/api`)
- Build standard CRUD controllers and route definitions for existing domain use cases.
- Add request input validation schemas using Zod / Fastify JSON schemas.
- Implement cursor-based and offset pagination helpers for list endpoints.
- Ensure standard JSON envelope formatting (`{ success: true, data: ... }`).

### 3.3 Notification System
- Design HTML/MJML email templates (welcome email, password reset, enrollment confirmation).
- Implement in-app notification components (toast alerts, bell icon drawer).
- Wire email dispatch calls to the notification provider.

### 3.4 Testing & Documentation
- Write unit tests for new application use cases and domain services.
- Write Fastify route integration tests in `apps/api/test/`.
- Maintain and expand `docs/api_endpoints_reference.md` as new endpoints are published.

---

## 4. Collaboration & Delivery Workflow

```text
[Chakresh] Define Contract / Interface (`packages/contracts`)
                         │
                         ▼
[Chakresh] Implement Core Domain Logic & DB Schema
                         │
                         ├─────────────────────────────────────────┐
                         ▼                                         ▼
[Adarsh] Build Fastify REST Controllers            [Adarsh] Build Next.js UI Screens
                         │                                         │
                         ▼                                         ▼
[Adarsh] Add Request Validation & Unit Tests       [Adarsh] Wire API Requests & States
                         │                                         │
                         └─────────────────────────────────────────┘
                                                   │
                                                   ▼
                                       [Chakresh] PR Code Review
                                                   │
                                                   ▼
                                           Merge to `main`
```

### Handover Rules:
1. **Contract-First**: Chakresh defines the API contract / DTO in `packages/contracts/` before feature development starts.
2. **Independent Progress**: Adarsh implements UI screens and API route wrappers against the contract without waiting for backend internals.
3. **Merge Requirement**: Every pull request must pass `pnpm test` and `pnpm depcruise` before Chakresh reviews and merges.

---

## 5. Completed Work & Live Integration Status

### 5.1 Infrastructure, Queue & Outbox Engine (Completed by Chakresh)
- **PostgreSQL Transactional Outbox Pattern**: Built `outbox_events` schema and repository (`DrizzleOutboxRepository`). Published domain events are recorded within the same ACID transaction as the business entity changes.
- **PostgreSQL Queue Provider**: Built `PostgresQueueProvider` with concurrent-safe row locking (`FOR UPDATE SKIP LOCKED`), supporting priority queues (`default`, `video`, `email`, `billing`), backoff retry delays, and dead-letter failure handling.
- **Background Worker Engine (`apps/worker`)**:
  - `OutboxPublisher`: Polling service that fetches pending outbox events and dispatches them as asynchronous queue jobs.
  - `WorkerPool`: Concurrent multi-worker pool processing jobs across dedicated queues.

### 5.2 Video Transcoding & HLS Streaming Pipeline (Completed by Chakresh)
- **FFmpeg Transcoding Pipeline (`apps/worker/src/services/transcoder.js`)**:
  - Automated generation of multi-bitrate HLS streams: **360p** (640x360 @ 800k), **720p** (1280x720 @ 2500k), and **1080p** (1920x1080 @ 4500k).
  - Production of `master.m3u8` variant playlist and automatic extraction of `poster.jpg` video thumbnail.
- **Neon PostgreSQL Media Tracking**: Automated lifecycle transitions: `ENCODING` $\rightarrow$ `READY` with `hls_manifest_url` persistence.
- **API & Upload Wiring**:
  - `POST /api/v1/internal/media/upload`: Ingests video binaries, creates `media_assets` row, and publishes `MediaUploaded` outbox event.
  - `GET /api/v1/internal/media/status/:id`: Status polling endpoint for real-time transcode progress.
  - `GET /uploads/*`: Fastify static media server supporting HLS manifests (`.m3u8`), video segments (`.ts`), and MP4 streams.

### 5.3 UI & Interactive Classroom Integration (Completed by Chakresh & Adarsh)
- **Interactive Student Player (`HlsVideoPlayer.jsx`)**:
  - Full adaptive bitrate streaming powered by `Hls.js` with manual quality selection (Auto, 1080p, 720p, 360p), playback speeds (0.75x–2x), interactive chapter checkpoints, volume/fullscreen controls, and keyboard shortcuts.
- **Dedicated Classroom View (`/courses/[id]/lesson/[lessonId]`)**:
  - Split-view classroom interface with collapsible curriculum syllabus, interactive chapter jumps, real-time autosaved student notes in `localStorage`, and interactive quiz evaluations.
- **Curriculum Builder Integration (`/courses/[id]`)**:
  - `MediaUploader` integrated into the course builder modal with live transcode status polling badge ("Worker Transcoding Multi-Bitrate HLS...").
  - Automated attachment of `hlsUrl` onto created lesson modules.
- **End-to-End Learning Persistence**:
  - Wired `ApiClient.completeLesson` and `ApiClient.submitQuiz` to `apps/web/app/dashboard/courses/[id]/learn/page.js` and `apps/web/app/dashboard/courses/[id]/lesson/[lessonId]/page.js`.
  - Student progress and quiz evaluation scores persist directly to Neon PostgreSQL `student_progress` and `quiz_submissions` tables.

### 5.4 Test Suite & Quality Verification
- Added in-memory fallback stores to `DrizzleCourseRepository` and `DrizzleLessonModuleRepository` ensuring unit tests pass independently of live database connections.
- Verified 100% passing test suites across database repositories and video transcoding pipeline.
- Verified zero circular or illegal layer dependencies via `pnpm depcruise` (585 modules, 658 dependencies).


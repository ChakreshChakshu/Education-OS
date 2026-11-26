# EducationOS Pre-Release Security, Logic & Cross-Layer Audit Report

- **Project**: EducationOS Monorepo (`/home/chakresh/EducationOS`)
- **Audit Date**: `2026-11-25`
- **Baseline Commit**: `c42020c` (branch: `main`)
- **Audit Posture**: Strictly Read-Only (zero application source, config, test, or existing documentation files modified)
- **Total Verified Findings**: **46** (**19 Backend** [`BE-01`–`BE-19`] + **27 UI** [`UI-01`–`UI-27`])

---

## 1. Executive Summary

A repository-wide, read-only security, data-integrity, and logic audit of EducationOS was conducted across the Next.js frontend (`apps/web`, `packages/ui`), the Fastify v4 API (`apps/api`), the background worker (`apps/worker`), all domain modules (`packages/domains/*`), and all infrastructure packages (`packages/infrastructure/*`). Every finding in this report has been traced to exact source files, line ranges, and symbols in the baseline `c42020c` codebase.

The audit identified **46 verified loopholes** spanning authentication and multi-tenant isolation, server-side data integrity, client-side runtime stability, and cross-layer UI–API contract alignment. **10 Critical** and **15 High** findings constitute direct pre-release blockers, including unauthenticated account takeover via leaked activation tokens (`BE-01`), percent-encoded path traversal (`..%2f`) allowing arbitrary file read on the API host (`BE-02`), cross-tenant video URL overwrite via an empty `LIKE '%%'` predicate in the transcode worker (`BE-03`), `x-tenant-id` header tenant-isolation bypasses (`BE-04`, `BE-05`, `UI-04`), silent in-memory persistence in 4 core repositories (`BE-06`), broken public student checkout and self-enrollment contracts (`UI-02`), client-side quiz grading with browser-resident answer keys (`UI-03`, `BE-05`, `BE-18`), and deterministic runtime crashes on root domains and modal/submission views (`UI-05`, `UI-06`, `UI-07`, `UI-08`).

### 1.1 Findings Breakdown by Side & Severity

| Side | Critical | High | Medium | Low | Total |
|---|---:|---:|---:|---:|---:|
| **Backend** (`BE-01`–`BE-19`) | 5 | 7 | 7 | 0 | **19** |
| **UI** (`UI-01`–`UI-27`) | 5 | 8 | 10 | 4 | **27** |
| **Combined Total** | **10** | **15** | **17** | **4** | **46** |

### 1.2 Findings Breakdown by Category

| Category | Backend IDs | UI IDs | Total |
|---|---|---|---:|
| **Security / Auth / Access Control** | `BE-01`, `BE-02`, `BE-04`, `BE-05`, `BE-07`, `BE-08`, `BE-09`, `BE-10`, `BE-12`, `BE-15`, `BE-16` (11) | `UI-01`, `UI-03`, `UI-04`, `UI-06`, `UI-09`, `UI-12`, `UI-27` (7) | **18** |
| **Backend Logic / Data Integrity** | `BE-03`, `BE-06`, `BE-11`, `BE-13`, `BE-14`, `BE-17`, `BE-19` (7) | — (0) | **7** |
| **UI / Validation / State Edge Cases** | — (0) | `UI-05`, `UI-07`, `UI-08`, `UI-14`, `UI-15`, `UI-20`, `UI-21`, `UI-22`, `UI-23`, `UI-24`, `UI-25`, `UI-26` (12) | **12** |
| **Cross-Layer UI–API Contracts** | `BE-18` (1) | `UI-02`, `UI-10`, `UI-11`, `UI-13`, `UI-16`, `UI-17`, `UI-18`, `UI-19` (8) | **9** |
| **Total** | **19** | **27** | **46** |

### 1.3 High-Impact Pre-Release Blockers

| ID(s) | Severity | Surface | Core Risk Summary |
|---|---|---|---|
| `BE-01` | Critical | Public Storefront & Activation | `POST /storefront/:slug/enroll` and `POST /academics/enrollments` return `activationToken` and `temporaryPassword` in JSON responses; submitting the token to `/auth/activate` overwrites the target user's password and issues active session cookies. |
| `BE-02` | Critical | `GET /uploads/*` & Media Status | Percent-encoded slash traversal (`..%2f` / `%2e%2e%2f`) bypasses Fastify v4 router normalization and reads arbitrary host files (e.g., `.env`); `/uploads/*` also lacks auth/tenant checks. |
| `BE-03` | Critical | Transcode Worker (`video.transcode`) | When `moduleId` and `filename` are absent/empty, `LIKE '%' \|\| '' \|\| '%'` evaluates to `'%%'` and overwrites `content_url` across all video `lesson_modules` in all tenants. |
| `BE-04` | Critical | `POST /internal/media/confirm` | `ConfirmMediaUploadUseCase` mutates and saves before returning an object without `tenantId`; fail-open `assertSameTenant` lets Tenant A confirm and transcode Tenant B's `mediaAssetId`. |
| `BE-05` / `UI-03` | Critical | `internal/learning.js` & Quiz Players | All 8 learning routes lack RBAC/enrollment checks; sending an arbitrary non-member `x-tenant-id` sets `request.tenantId = null`, bypassing `assertCourseInTenant`/`assertLessonInTenant`; quiz grading trusts client `score` while UI embeds answer keys. |
| `BE-06` | High | Persistence (`DatabaseClient` vs Drizzle) | 4 repositories (`MediaAsset`, `Batch`, `QuizSubmission`, `Organization`) check `this.db.select`/`insert` on `DatabaseClient` without `.connect()`, silently persisting only to in-memory `Map`s. |
| `UI-01` | Critical | Dashboard RBAC & Secret Exposure | Admin pages/components lack role guards; `DashboardOverviewPage` runs `loadAdminData()` in student mode (and `loadStudentData()` in admin mode); `StudentsPage` exposes `temporaryPassword` and `activationToken` in DOM/state. |
| `UI-02` | Critical | Student Checkout & Self-Enrollment | Public checkout calls tenant-creating `/public/auth/register` (making students `ADMIN` of new tenants); `enrollStudent` sends `studentUserId`/`studentEmail`, failing `isSelfEnrollment` (`403 course.update`); fallback writes synthetic `localStorage` identity rejected by `DashboardLayout`. |
| `UI-04` | Critical | `TenantsPage` Provisioning | `updateTenantSettings` fires before `addTenant`/`switchTenant` updates `eos_tenant_id`, overwriting the previously active tenant's settings via `x-tenant-id`. |
| `UI-05` | Critical | Root Domain & `DashboardLayout` | `parts.length > 1` misclassifies 2-label apex domains (e.g., `educationos.com`) as subdomains, locking out users and rendering unimported `<LockSimple />` (`ReferenceError` crash). |
| `UI-06`–`UI-08` | High | Login & Assessment UI Stability | Open redirect + missing `ApiClient` import in `/login` (`UI-06`); React Rules-of-Hooks crash in quiz/assignment builder modals (`UI-07`); unimported `Eye` icon crash in `AssignmentSubmissionPlayer` (`UI-08`). |

---

## 2. Audit Methodology & Architecture Coverage Overview

### 2.1 Multi-Agent Audit Workflow

1. **Survey Phase**: Dedicated UI and Backend survey explorers mapped the repository architecture (`apps/web`, `apps/api`, `apps/worker`, `packages/domains/*`, `packages/infrastructure/*`, `packages/ui`, and shared packages) and cataloged candidate loopholes across security, logic, and UI state.
2. **Deep Verification Phase**:
   - **UI Audit Agent (`UI-01`–`UI-27`)**: Re-verified all 18 Phase 1 UI claims directly against current `HEAD` source in `apps/web/` and `packages/ui/`, cross-checked UI callers against `apps/api/src/` route handlers and `rbac-defaults.js`, refined 3 Phase 1 edge cases (removing stale `.turbo/turbo-lint.log` references from an older commit), and uncovered 4 additional Phase 2 defects (`UI-07`, `UI-08`, `UI-15`, `UI-23`).
   - **Backend Audit Agent (`BE-01`–`BE-19`)**: Re-verified all 17 Phase 1 backend claims across `apps/api`, `apps/worker`, `packages/domains/*`, and `packages/infrastructure/*`, discovered an additional `x-tenant-id` header tenant-isolation bypass across `internal/learning.js` (`BE-05`), and identified 2 additional Phase 2 findings (`BE-18`, `BE-19`).
3. **Consolidation Phase**: Both verified reports were synthesized into this unified reference document without altering any application source, configuration, test, or existing documentation file.

### 2.2 Verification Method Notes (Static + Fastify v4 Runtime Check)

- **Static Code & Contract Verification**: All 46 findings are verified through line-level inspection of source files, middleware chains, Drizzle/SQL schemas, domain entities/use cases, and cross-layer UI–API contracts. Note that existing API test suites (`apps/api/test/api.test.js:17`, `forgot-password.test.js:16`, `storefront.test.js:16`) set `ALLOW_DEV_AUTH_BYPASS = 'true'`, which masks production RBAC/tenant checks and conceals the in-memory `Map` split-brain in `BE-06`.
- **Runtime Verification of `BE-02` (`fastify@4.26.1`)**: Because Fastify's underlying router (`find-my-way`) normalizes literal dot segments before wildcard matching, an in-memory `app.inject()` check was executed against the installed `apps/api/node_modules/fastify` (`4.26.1`) to confirm exact routing behavior:
  - Literal `/uploads/../.env` is collapsed by the router and returns `404`.
  - Percent-encoded slash forms (`/uploads/..%2f.env` and `/uploads/%2e%2e%2f.env`) match `/uploads/*` and URL-decode `request.params['*']` to `'../.env'`, causing `path.join(process.cwd(), 'uploads', subpath)` in `apps/api/src/index.js:44` to resolve outside `uploads/` and return HTTP `200`.
- **Non-Executed Checks**: Live `apps/api` / `apps/worker` daemons, live Neon PostgreSQL queries, and `next build` / `eslint` runs were not executed during this read-only audit (`apps/api/.env` was intentionally not read).

---

## 3. Cross-Layer Compound Loophole Chains

Several critical defects span both UI and Backend layers, amplifying impact or breaking core user journeys end-to-end when combined.

### Chain 1: Public Checkout, Storefront Account Takeover, & Broken Self-Enrollment (`UI-02` + `UI-06` + `UI-17` + `BE-01` + `BE-09`)

1. **Unauthenticated storefront takeover (`BE-01` + `BE-09`)**: `POST /api/v1/public/storefront/:slug/enroll` accepts unauthenticated requests for any course belonging to a tenant—ignoring `course.visibility` (`PRIVATE`/`DRAFT`/`ARCHIVED` exposure in `BE-09`)—and returns `EnrollStudentUseCase`'s `activationToken` and 4-digit `temporaryPassword` directly in the HTTP `201` JSON response (`public/index.js:928`). Submitting that `activationToken` to `POST /api/v1/public/auth/activate` overwrites the existing user's password hash (`public/index.js:360-367`) and sets authenticated session cookies.
2. **Broken legitimate UI checkout (`UI-02` + `UI-06` + `UI-17`)**: Meanwhile, legitimate UI checkout on `/courses/[id]` and `/t/[slug]/courses` calls `POST /api/v1/public/auth/register` (provisioning a bogus `ADMIN` tenant for the student instead of enrolling them), displays 100x inflated prices (`$4900` instead of `$49.00`, `UI-17`), and calls `POST /api/v1/internal/academics/enrollments` with `studentUserId`/`studentEmail` populated—causing `isSelfEnrollment` (`academics.js:445-451`) to evaluate `false` and fail with `403 course.update` (`rbac-defaults.js:29`). The UI fallback then writes a synthetic `"std-..."` `localStorage` user rejected by `DashboardLayout`, while `?autoEnroll=` on `/login` throws `ReferenceError: ApiClient is not defined` (`UI-06`).

### Chain 2: Assessment Integrity Collapse & Cross-Tenant Quiz Manipulation (`UI-03` + `UI-07` + `UI-08` + `UI-14` + `UI-15` + `UI-22` + `BE-05` + `BE-13` + `BE-18`)

1. **Client-owned answers & scores (`UI-03` + `BE-05` + `BE-18`)**: `ClassroomLessonPage` and `McqQuizPlayer` embed quiz answer keys (`correct` / `isCorrect`) in client state, compute scores locally, and submit `{ studentUserId, score, passingScore }` from `localStorage.eos_user` to `POST /api/v1/internal/learning/quizzes/submit`. The backend trusts client-supplied `score` and `passingScore` (`SubmitQuizUseCase.js:12-29`) and auto-marks the lesson complete (`learning.js:123-133`).
2. **Cross-tenant bypass (`BE-05`)**: Because `learning.js` omits `authorize(...)` and `requireTenant`, sending an arbitrary non-member `x-tenant-id` header sets `request.tenantId = null`, causing `assertCourseInTenant` and `assertLessonInTenant` (`if (... || !request.tenantId || ...) return true`) to pass for any course or lesson on the platform.
3. **Persistence & UI crashes (`UI-07` + `UI-08` + `UI-14` + `UI-15` + `UI-22` + `BE-06` + `BE-13` + `BE-18`)**: Editing a lesson module drops `quiz_json` to `NULL` because `LessonModule.create()` strips `quiz` (`BE-13`); quiz submissions write only to an in-memory `Map` (`BE-06`); Type B PDF assignments exist only in `localStorage` with synthetic mock submissions (`UI-15`, `BE-18`); opening the quiz/assignment builder modals triggers a Rules-of-Hooks crash (`UI-07`); and viewing an assignment submission receipt triggers `ReferenceError: Eye is not defined` (`UI-08`).

### Chain 3: Multi-Tenant Isolation Breakdown & Cross-Tenant Settings Overwrite (`UI-01` + `UI-04` + `UI-16` + `UI-23` + `BE-04` + `BE-05` + `BE-16` + `BE-19`)

1. **Header-driven cross-tenant mutation (`UI-04` + `BE-04` + `BE-05`)**: On the frontend, `TenantsPage` creates a new tenant and calls `PATCH /api/v1/internal/tenants/current/settings` before switching `localStorage.eos_tenant_id`, silently overwriting the **previous** tenant's branding via `x-tenant-id` (`UI-04`). On the backend, `POST /internal/media/confirm` passes `undefined` to a fail-open `assertSameTenant` (`BE-04`), and `learning.js` fails open when `x-tenant-id` mismatches (`BE-05`).
2. **Schema & RBAC gaps (`UI-01` + `UI-16` + `UI-23` + `BE-16` + `BE-19`)**: Unvalidated `settingsJson` (`BE-16`) stored under `settingsJson.branding.*` fails to surface on public storefronts reading top-level `settings.*` (`UI-16`); student views lack route guards and command-palette tenant invalidation (`UI-01`, `UI-23`); and courses default to `DRAFT` with no publish endpoint (`BE-19`).

### Chain 4: Authentication, Session Lifecycle, CSRF, & Edge Routing Failures (`UI-05` + `UI-10` + `UI-11` + `UI-12` + `UI-13` + `UI-26` + `UI-27` + `BE-07` + `BE-08` + `BE-10` + `BE-11` + `BE-15`)

1. **Root-domain lockout & edge bypass (`UI-05` + `UI-12`)**: Requests to `/dashboard/...` containing any dot bypass edge cookie checks in `apps/web/proxy.js:48`, while `auth-context.js:121-138` misclassifies 2-label production apex domains (e.g., `educationos.com`) as subdomains, wipes local tenant state, and crashes on unimported `<LockSimple />` (`UI-05`).
2. **Cookie/CSRF/refresh fragility (`UI-10` + `UI-11` + `BE-11`)**: Host-only `csrf_token` and `SameSite=Strict` `refresh_token` cookies break cross-origin API calls (`UI-10`); parallel mount requests race on single-use rotating refresh tokens (`UI-11`) against a non-atomic `RefreshTokenUseCase` (`BE-11`); and `activate/page.js` redirects before syncing `AuthContext` (`UI-13`).
3. **Credential & recovery weaknesses (`BE-07` + `BE-08` + `BE-10` + `BE-15` + `UI-26` + `UI-27`)**: `services.js:81-86` allows `'hashed_'` plaintext-prefix comparison in production, suspended users/tenants remain active (`BE-07`), `/auth/forgot-password` trusts `Origin`/`Referer` and leaks `devResetUrl` outside `NODE_ENV=production` (`BE-08`, with developer email exposure in `UI-27`), auth routes lack rate limits (`BE-10`), and password changes do not revoke refresh sessions (`BE-15`).

### Chain 5: Media Upload, Transcode Worker Corruption, & URL Configuration (`UI-09` + `UI-18` + `UI-21` + `BE-02` + `BE-03` + `BE-06` + `BE-12` + `BE-17` + `BE-18`)

1. **Upload-to-playback pipeline failure (`BE-06` + `BE-12` + `BE-18` + `UI-18` + `UI-21`)**: `DrizzleMediaAssetRepository` writes only to an in-memory `Map` (`BE-06`), diverging from PostgreSQL queries in `GET /media/status/:id` and `apps/worker`. `media.js` and `lesson/[lessonId]` hardcode `http://localhost:3001` (`BE-12`, `UI-18`), while `NEXT_PUBLIC_API_URL` including `/api/v1` breaks `next.config.mjs` `/uploads/:path*` rewrites (`UI-18`, `BE-18`), and `MediaUploader` leaks its polling interval without forwarding `hlsUrl` (`UI-21`).
2. **Storage security & corruption (`BE-02` + `BE-03` + `BE-12` + `BE-17` + `UI-09`)**: Unauthenticated `GET /uploads/*` exposes host files via `%2f` traversal (`BE-02`), `POST /media/upload` and R2 presigned URLs lack MIME/size enforcement (`BE-12`), failed transcodes write synthetic test videos as `READY` (`BE-17`), missing filenames trigger `LIKE '%%'` cross-tenant URL corruption (`BE-03`), and the UI renders uploaded content in unsandboxed iframes without URL scheme validation (`UI-09`).

---

## 4. Backend Loophole Findings (`BE-01` through `BE-19`)

### 4.1 Critical Findings (Backend)

#### `[BE-01]` Unauthenticated Account Takeover & Unauthorized Enrollment via Storefront / Enrollment Activation Token Leak
- **Severity**: Critical
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/public/index.js:866-931` (`POST /api/v1/public/storefront/:slug/enroll`)
  - `packages/domains/learning/application/use-cases/EnrollStudentUseCase.js:13-128` (`EnrollStudentUseCase.execute`)
  - `apps/api/src/routes/v1/public/index.js:283-329` (`GET /api/v1/public/auth/verify-activation-token`)
  - `apps/api/src/routes/v1/public/index.js:332-428` (`POST /api/v1/public/auth/activate`)
  - `apps/api/src/routes/v1/internal/academics.js:419-519` (`POST /api/v1/internal/academics/enrollments`)
- **Symbols**: `publicRoutes`, `EnrollStudentUseCase.prototype.execute`, `academicsRoutes`, `userRepo.updatePassword`
- **Traced Code Path**:
  1. `POST /api/v1/public/storefront/:slug/enroll` (`public/index.js:866-931`) requires no authentication and invokes `EnrollStudentUseCase.execute({ tenantId: tenant.id, courseId: course.id, studentEmail: email, studentName })` (`911-916`).
  2. Inside `EnrollStudentUseCase.js:28-33`, when `studentEmail` matches an existing user (including any institution `ADMIN` or `INSTRUCTOR`), `resolvedStudentId` is set to `existingUser.id`. When no user exists, lines `34-36` generate a weak 4-digit temporary password via `Math.random()` (`Learn@${Math.floor(1000 + Math.random() * 9000)}`).
  3. Lines `70-81` unconditionally sign a 7-day JWT `activationToken` containing `{ userId: resolvedStudentId, tenantId, email, type: 'student_activation' }`.
  4. Lines `95-96` and `120-121` attach `temporaryPassword`, `activationToken`, and `activationUrl` onto the returned `Enrollment` object, and `public/index.js:928` returns `{ enrollment: enrollRes.getValue() }` directly in the HTTP `201` JSON response.
  5. Submitting that `activationToken` to `POST /api/v1/public/auth/activate` (`public/index.js:348-426`) verifies `decoded.type === 'student_activation'`, overwrites the user's password hash via `userRepo.updatePassword(decoded.userId, newHash)` (`360-367`), assigns `STUDENT`, creates a `user_sessions` record, and sets valid `access_token` / `refresh_token` cookies for `decoded.userId`.
  6. The same leak occurs on `POST /api/v1/internal/academics/enrollments` (`academics.js:516`), returning `activationToken` and `temporaryPassword` in the response—allowing an admin in Tenant A who enrolls a user belonging to Tenant B to obtain a password-resetting activation token for the external user's global account.
- **Concrete Impact**: Unauthenticated full account takeover of any existing user (including `ADMIN`s) not yet actively enrolled in a storefront course; cross-tenant account takeover via internal enrollment; and unauthenticated enrollment into any course without payment or authorization.
- **Defensive Remediation**:
  - Strip `activationToken`, `activationUrl`, and `temporaryPassword` from all HTTP API responses (`public/index.js:928`, `academics.js:516`); deliver onboarding links exclusively via email (`OutboxRepository` -> worker).
  - Never issue password-resetting `student_activation` tokens for already-active users; for newly provisioned unactivated users, store a single-use random token hash in DB (or bind JWT to a password-version/nonce) and invalidate on first use.
  - Use `crypto.randomBytes` instead of `Math.random()` if temporary credentials are ever generated, and gate public enrollment on verified payment/free-course eligibility.

#### `[BE-02]` Arbitrary File Read (`%2f` Path Traversal) & Unauthenticated Media Access in `GET /uploads/*`
- **Severity**: Critical
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/index.js:42-98` (`fastify.get('/uploads/*', ...)`)
  - `apps/api/src/routes/v1/internal/media.js:110-149` (`GET /api/v1/internal/media/status/:id`)
- **Symbols**: `start` (`fastify.get('/uploads/*')`), `mediaRoutes` (`GET /status/:id`)
- **Traced Code Path**:
  1. `apps/api/src/index.js:42-44` extracts `const subpath = request.params['*'] || '';` and computes `const filePath = path.join(process.cwd(), 'uploads', subpath);` without `path.resolve` canonicalization or prefix containment verification.
  2. Runtime verification against the installed `fastify@4.26.1` (`find-my-way`) router confirmed that while literal `../` segments are collapsed by the router to `404`, percent-encoded slash traversal (`..%2f` and `%2e%2e%2f`) matches `/uploads/*` and URL-decodes `request.params['*']` to `'../...'`, resolving `filePath` outside `uploads/` and streaming the file via `fs.createReadStream(filePath)` (`96`) with HTTP `200`.
  3. Line `47` sets `Access-Control-Allow-Origin` to `request.headers.origin || '*'`, allowing cross-origin reads.
  4. Lines `50-63`: on local cache miss, `storageProvider.download(subpath)` downloads arbitrary R2 bucket keys and writes them to the unvalidated `filePath` (`60`).
  5. Additionally, `/uploads/*` has no authentication or tenant/enrollment check, exposing all uploaded tenant files publicly.
  6. Similarly, `media.js:119-129` checks `path.join(process.cwd(), 'uploads', 'hls', id, 'master.m3u8')` with an unvalidated `:id` parameter when no DB row is found, bypassing `assertSameTenant`.
- **Concrete Impact**: Arbitrary local file read on the API host (including `apps/api/.env` database/JWT/R2/Resend secrets when `process.cwd()` is `apps/api`), arbitrary R2 bucket key download, and unauthenticated cross-tenant access to private course media.
- **Defensive Remediation**:
  - Canonicalize local paths with `const uploadsRoot = path.resolve(process.cwd(), 'uploads'); const resolved = path.resolve(uploadsRoot, subpath);` and reject with `400`/`403` unless `resolved.startsWith(uploadsRoot + path.sep)` and `subpath` rejects null bytes and `..` segments.
  - Validate `:id` as UUID in `GET /media/status/:id` and remove the unauthenticated filesystem fallback (`media.js:119-129`).
  - Require authentication and course-enrollment/tenant authorization for private media access, or serve via short-lived signed R2 URLs.

#### `[BE-03]` Cross-Tenant Data Corruption in Video Transcode Worker (`LIKE '%%'` Wildcard Overwrite)
- **Severity**: Critical
- **Category**: Backend Logic / Data Integrity
- **Exact File Paths & Line Ranges**:
  - `apps/worker/src/processors/index.js:198-216` (`PROCESSORS[JOBS.VIDEO_TRANSCODE]`)
  - `apps/api/src/routes/v1/internal/media.js:76-91, 208-224` (`MediaUploaded` event emission)
- **Symbols**: `PROCESSORS['video.transcode']`, `mediaRoutes`
- **Traced Code Path**:
  1. `POST /api/v1/internal/media/upload` (`media.js:78-89`) emits `MediaUploaded` without `moduleId`; `POST /api/v1/internal/media/confirm` (`219`) sets `moduleId: request.body?.moduleId || null`.
  2. When `payload.moduleId` is absent/null, `apps/worker/src/processors/index.js:208-215` executes:
     `UPDATE lesson_modules SET content_url = $1, updated_at = NOW() WHERE (content_url LIKE '%' || $2 || '%' OR content_url LIKE '%' || $3 || '%') AND (content_type = 'VIDEO' OR content_type IS NULL)`
     with `[manifestUrl, mediaAssetId, payload.filename || '']`.
  3. Whenever `payload.filename` is empty/null, `'%' || '' || '%'` evaluates to `'%%'`, matching **every** `lesson_modules` row across **all courses and all tenants** with `content_url IS NOT NULL` and `content_type = 'VIDEO'` (or `NULL`), overwriting every lesson video URL on the platform with `manifestUrl`.
  4. Even with a non-empty generic filename (e.g., `intro.mp4`), there is no `tenant_id` or `course_id` join filter, allowing one tenant's transcode job to overwrite another tenant's `lesson_modules.content_url`.
- **Concrete Impact**: Platform-wide cross-tenant corruption of video lesson URLs across every institution.
- **Defensive Remediation**:
  - Never update `lesson_modules` using `LIKE '%' || filename || '%'`. Require explicit `moduleId` verified against `courses.tenant_id = $tenantId`, or match strictly on exact `mediaAssetId` UUID / tenant-scoped storage key joined with `courses.tenant_id`.

#### `[BE-04]` Tenant Isolation Bypass on `POST /api/v1/internal/media/confirm`
- **Severity**: Critical
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/internal/media.js:11-20, 190-232` (`assertSameTenant`, `POST /confirm`)
  - `packages/domains/media/application/use-cases/ConfirmMediaUploadUseCase.js:8-25` (`ConfirmMediaUploadUseCase.execute`)
- **Symbols**: `assertSameTenant`, `ConfirmMediaUploadUseCase.prototype.execute`
- **Traced Code Path**:
  1. `POST /api/v1/internal/media/confirm` (`media.js:194-195`) invokes `ConfirmMediaUploadUseCase.execute(request.body)` without passing `request.tenantId`.
  2. `ConfirmMediaUploadUseCase.js:16-17` immediately mutates `asset.markUploaded()` and persists `await this.mediaAssetRepository.save(asset)`.
  3. `ConfirmMediaUploadUseCase.js:19-24` returns `{ id: asset.id, filename: asset.filename, status: asset.status, storageKey: asset.storageKey }` — omitting `tenantId`.
  4. `media.js:205` calls `assertSameTenant(request, reply, media.tenantId)`. Because `assertSameTenant` (`media.js:15`) checks `if (resourceTenantId && resourceTenantId !== request.tenantId)`, `media.tenantId === undefined` causes the condition to evaluate `false` and return `true`.
  5. Lines `210-222` then emit a `MediaUploaded` outbox event for another tenant's `mediaAssetId`.
- **Concrete Impact**: Cross-tenant IDOR allowing any user with `media.upload` in Tenant A to confirm and trigger transcoding on Tenant B's `mediaAssetId`.
- **Defensive Remediation**:
  - Include `tenantId: asset.tenantId` in `ConfirmMediaUploadUseCase` output, validate tenant ownership **before** mutating/saving `asset` (pass `tenantId` into `ConfirmMediaUploadUseCase.execute` and enforce `asset.tenantId === tenantId`), and make `assertSameTenant` fail-closed (`if (!resourceTenantId || resourceTenantId !== request.tenantId)`).

#### `[BE-05]` Unprotected Learning Endpoints, `x-tenant-id` Header Isolation Bypass, & Client-Controlled Quiz Grading
- **Severity**: Critical
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/internal/learning.js:23-47, 52-398` (all 8 `/api/v1/internal/learning/*` routes)
  - `apps/api/src/middleware/tenantScope.js:20-108` (`resolveTenantScope`, `requireTenant`)
  - `packages/domains/learning/application/use-cases/SubmitQuizUseCase.js:11-47` (`SubmitQuizUseCase.execute`)
  - `packages/domains/learning/application/use-cases/SaveLessonNoteUseCase.js:10-60`
  - `packages/domains/learning/application/use-cases/CreateLessonBookmarkUseCase.js:9-45`
- **Symbols**: `learningRoutes`, `assertCourseInTenant`, `assertLessonInTenant`, `resolveTenantScope`, `SubmitQuizUseCase.prototype.execute`
- **Traced Code Path**:
  1. **Zero RBAC or enrollment checks**: None of the 8 endpoints in `learning.js:52-397` (`POST /lessons/complete`, `POST /quizzes/submit`, `GET /courses/:courseId/progress`, `GET/PUT /lessons/:lessonId/notes`, `GET/POST/DELETE /lessons/:lessonId/bookmarks`) use `authorize(...)` (`lesson.read` / `assessment.submit`) or verify an active enrollment in the course.
  2. **`x-tenant-id` header tenant-isolation bypass**: `learning.js` never calls `requireTenant(request, reply)`. When any authenticated user (even a student in Tenant A) sends an arbitrary non-member header `x-tenant-id`, `resolveTenantScope` (`tenantScope.js:64-75`) sets `request.tenantId = null` and `request.tenantMismatch = true` without rejecting the request. Then `assertCourseInTenant` (`learning.js:24`) and `assertLessonInTenant` (`learning.js:37`) evaluate `if (isDevAuthBypassEnabled() || !request.tenantId || !courseId) return true;`, bypassing cross-tenant isolation on `/lessons/complete`, `/quizzes/submit`, and `/courses/:courseId/progress`.
  3. **Client-trusted quiz scores**: `POST /quizzes/submit` (`learning.js:98-113`) and `SubmitQuizUseCase.js:12-29` accept `score` and `passingScore` directly from `request.body` without reading `lessonModule.quiz` or grading submitted answers server-side. When `passed` is `true`, `learning.js:123-133` automatically calls `MarkLessonCompleteUseCase`.
  4. **Unscoped notes/bookmarks**: `GET/PUT /lessons/:lessonId/notes` and `GET/POST/DELETE /lessons/:lessonId/bookmarks` (`learning.js:182-397`) do not call `assertLessonInTenant` or verify lesson existence (`SaveLessonNoteUseCase` injects `lessonModuleRepository` at line `6` but never queries it).
- **Concrete Impact**: Any authenticated user across the platform can forge 100% quiz scores and mark lessons complete in any tenant's courses by passing a non-member `x-tenant-id` header, and can read/write notes and bookmarks against arbitrary cross-tenant `lessonId`s.
- **Defensive Remediation**:
  - Add `preHandler: authorize('assessment.submit')` / `authorize('lesson.read')` (which invokes `requireTenant`) and verify active `Enrollment` for `(studentUserId, courseId)` on all learning routes.
  - Make `assertCourseInTenant` and `assertLessonInTenant` fail-closed (`if (!request.tenantId) return false` outside dev bypass).
  - Grade quiz answers server-side in `SubmitQuizUseCase` against stored `lessonModule.quiz` and server-configured `passingScore`.
  - Enforce `assertLessonInTenant` on all notes and bookmarks endpoints.

---

### 4.2 High Findings (Backend)

#### `[BE-06]` Broken Repository Persistence (`DatabaseClient` vs Drizzle ORM API Mismatch)
- **Severity**: High
- **Category**: Backend Logic / Data Integrity
- **Exact File Paths & Line Ranges**:
  - `packages/infrastructure/database/src/client/index.js:28-101` (`DatabaseClient`)
  - `apps/api/src/bootstrap/services.js:104-107, 139-161` (`registerServices`)
  - `packages/infrastructure/database/src/repositories/DrizzleMediaAssetRepository.js:51-91`
  - `packages/infrastructure/database/src/repositories/DrizzleBatchRepository.js:61-102`
  - `packages/infrastructure/database/src/repositories/DrizzleQuizSubmissionRepository.js:46-65`
  - `packages/infrastructure/database/src/repositories/DrizzleOrganizationRepository.js:82-152`
  - `packages/infrastructure/database/src/repositories/DrizzleUserRepository.js:121-143` & `DrizzleRoleAssignmentRepository.js:10-92`
- **Symbols**: `DatabaseClient`, `DrizzleMediaAssetRepository`, `DrizzleBatchRepository`, `DrizzleQuizSubmissionRepository`, `DrizzleOrganizationRepository`
- **Traced Code Path**:
  1. `services.js:104-107` instantiates `dbClient = new DatabaseClient(...)` and injects `dbClient` into all 15 repositories (`139-161`).
  2. `DatabaseClient` (`client/index.js:28-101`) only defines `.connect()`, `.query()`, and `.disconnect()` — it has no `.select`, `.insert`, or `.update` methods (those exist only on the Drizzle instance returned by `await dbClient.connect()` when `drizzle-orm` is installed).
  3. `DrizzleMediaAssetRepository` (`51-91`), `DrizzleBatchRepository` (`61-102`), `DrizzleQuizSubmissionRepository` (`46-65`), and `DrizzleOrganizationRepository` (`82-152`) check `if (this.db && this.db.select)` / `this.db.insert` directly on `this.db` (`DatabaseClient`) without calling `await this.db.connect()` and without a `.query(...)` SQL fallback.
  4. All 4 repositories silently bypass PostgreSQL and persist solely to in-memory `Map` fields (`_assetStore`, `_batchStore`, `_submissionStore`, `_orgStore`/`_membershipStore`):
     - `POST /api/v1/internal/media/presign` and `/confirm` never write to PostgreSQL `media_assets`, causing split-brain state with `GET /media/status/:id` and `apps/worker` (which query PostgreSQL `media_assets`).
     - `POST/GET /api/v1/internal/academics/batches` never persist to PostgreSQL `batches`.
     - `POST /api/v1/internal/learning/quizzes/submit` never persists to PostgreSQL `quiz_submissions`.
     - `CreateTenantUseCase` never persists `organizations` or `organization_memberships` to PostgreSQL.
  5. Conversely, `DrizzleUserRepository.createStudentUser`/`updatePassword` (`121-143`), `DrizzleRoleAssignmentRepository` (`10-92`), and `DrizzleEnrollmentRepository` (`62-206`) call `const db = await this.db.connect(); await db.query(...)` — which only works because `drizzle-orm` is not installed in `apps/api` so `DatabaseClient.connect()` falls back to `this.db = this.pool` (`client/index.js:69`). Installing `drizzle-orm` would cause `db.query is not a function` crashes across those repositories.
- **Concrete Impact**: Silent data loss on restart, broken media presign/transcode integration, missing organization/batch/quiz persistence in PostgreSQL, and fragile Drizzle-vs-`pg` coupling.
- **Defensive Remediation**:
  - Standardize all repositories on a consistent DB access helper (`this.db.query(...)` on `DatabaseClient`, or properly unwrap Drizzle vs `pg.Pool` cleanly) and remove silent in-memory fallback maps in production repositories.

#### `[BE-07]` Plaintext-Equivalent `'hashed_'` Password Bypass, Unchecked User/Tenant Status, & Fallback `JWT_SECRET`
- **Severity**: High
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/bootstrap/services.js:61-70, 81-86` (`JWT_SECRET`, `passwordHasher.compare`)
  - `packages/domains/identity/application/use-cases/LoginUserUseCase.js:20-28`
  - `packages/domains/identity/application/use-cases/RefreshTokenUseCase.js:22-25`
  - `apps/api/src/middleware/tenantScope.js:49-88` (`resolveTenantScope`)
  - `packages/infrastructure/database/src/repositories/DrizzleRoleAssignmentRepository.js:43-92`
- **Symbols**: `registerServices`, `LoginUserUseCase.prototype.execute`, `RefreshTokenUseCase.prototype.execute`, `DrizzleRoleAssignmentRepository`
- **Traced Code Path**:
  1. `services.js:81-86`: `if (hash && hash.startsWith('hashed_')) return hash === \`hashed_${password}\`;` runs unconditionally in all environments, including `NODE_ENV === 'production'`. Any row with a `hashed_...` string (such as `packages/infrastructure/database/src/seed/seed.js:34, 45, 56`) authenticates via plaintext prefix comparison instead of bcrypt.
  2. `services.js:61-70`: `JWT_SECRET` throws only if `process.env.NODE_ENV === 'production'`; if `NODE_ENV` is unset or `staging`, it silently signs all JWTs with `'eos-secret-key-development-2026'`.
  3. `LoginUserUseCase.js:20-28` and `RefreshTokenUseCase.js:22-25` never verify `user.status === 'ACTIVE'` (`User.suspend()` in `User.js:89-96` has no effect on login or refresh).
  4. `DrizzleRoleAssignmentRepository.findTenantsWithRolesForUser` (`43-70`) filters only `t.deleted_at IS NULL` without checking `t.status = 'ACTIVE'`, `u.status = 'ACTIVE'`, or `user_tenant_memberships.status = 'ACTIVE'`, and `hasPermission` (`77-92`) never checks tenant, user, or membership status.
- **Concrete Impact**: Suspended users and suspended tenants continue to log in, refresh tokens, and execute privileged tenant actions; unset `NODE_ENV` exposes a hardcoded JWT signing secret.
- **Defensive Remediation**:
  - Remove the `'hashed_'` prefix branch from `services.js:82-84`; enforce `JWT_SECRET` whenever `NODE_ENV !== 'test'`.
  - Enforce `user.status === 'ACTIVE'` in `LoginUserUseCase`, `RefreshTokenUseCase`, and `authenticateJWT` (with session revocation on suspend).
  - Join/filter `t.status = 'ACTIVE'`, `u.status = 'ACTIVE'`, and active `user_tenant_memberships` in `DrizzleRoleAssignmentRepository`.

#### `[BE-08]` Origin/Referer Poisoning & Reset Token / Account Enumeration Leakage in `POST /auth/forgot-password`
- **Severity**: High
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/public/index.js:431-569` (`POST /api/v1/public/auth/forgot-password`)
- **Symbols**: `publicRoutes` (`POST /auth/forgot-password`)
- **Traced Code Path**:
  1. `public/index.js:475-478` reads `request.headers.origin || request.headers.referer` to construct `appUrl = process.env.APP_URL || originBase || 'http://localhost:3000'` and `resetLink = \`${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}\``. When `APP_URL` is unset, an unauthenticated caller can supply an arbitrary `Origin` or `Referer` header, poisoning the reset link emailed to the user and stored in `outbox_events` (`546`).
  2. `public/index.js:560-567` sets `const isDev = process.env.NODE_ENV !== 'production';` and includes `{ devResetUrl }`, `{ mailError }`, or `{ devWarning: \`No registered account found with email: ${email}\` }` in the HTTP `200` response.
- **Concrete Impact**: Instant unauthenticated account takeover whenever `NODE_ENV !== 'production'` (by reading `devResetUrl` directly from the response), account-existence enumeration (`devWarning`), and reset-token phishing via `Origin`/`Referer` header spoofing when `APP_URL` is unset.
- **Defensive Remediation**:
  - Never derive password reset URLs from `Origin` or `Referer` headers; require a validated `APP_URL` configuration or strict domain allowlist.
  - Never return `devResetUrl`, `mailError`, or `devWarning` in HTTP responses.

#### `[BE-09]` Private / Draft / Archived Course Exposure, Unauthorized Course Enrollment, & Unbounded Public Catalog Enumeration
- **Severity**: High
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/public/index.js:176-199` (`GET /tenants/:slug`)
  - `apps/api/src/routes/v1/public/index.js:731-863` (`GET /storefront/:slug/courses`, `GET /storefront/:slug/courses/:courseId`)
  - `apps/api/src/routes/v1/public/index.js:866-931` (`POST /storefront/:slug/enroll`)
  - `apps/api/src/routes/v1/public/index.js:938-1151` (`GET /courses`, `GET /courses/:courseId`)
  - `apps/api/src/routes/v1/internal/academics.js:419-480` (`POST /academics/enrollments` self-enrollment)
- **Symbols**: `publicRoutes`, `academicsRoutes`
- **Traced Code Path**:
  1. `GET /api/v1/public/tenants/:slug` (`176-198`) does not check `tenant.status` (unlike `/storefront/:slug` at `697`), exposing `SUSPENDED` or `ARCHIVED` tenant profiles and `settingsJson`.
  2. `GET /storefront/:slug/courses` (`760`) filters only `c.visibility !== 'PRIVATE'`, exposing `DRAFT`, `UNLISTED`, and `ARCHIVED` courses in public listings.
  3. `GET /storefront/:slug/courses/:courseId` (`820`) checks only `course.visibility === 'PRIVATE'`, exposing `DRAFT` and `ARCHIVED` course details and preview module `contentUrl` (`838`).
  4. `POST /storefront/:slug/enroll` (`902-908`) checks only `course.tenantId === tenant.id`, ignoring `course.visibility` and `course.status` entirely (`PRIVATE`/`DRAFT`/`ARCHIVED` courses can be enrolled in publicly).
  5. `GET /courses` (`942-1045`) and `GET /courses/:courseId` (`1072-1078`) invoke `courseRepo.findByTenantId(null)` (loading all courses across all tenants into memory), perform N+1 `tenantRepo.findById(c.tenantId)` queries, expose `DRAFT` and `UNLISTED` courses (`959`, `1078`), and slice using unvalidated `Number(offset)` / `Number(limit)`.
  6. `POST /api/v1/internal/academics/enrollments` (`academics.js:445-470`) skips `assertPermission` when `isSelfEnrollment` is true (omitting `studentUserId` and `studentEmail`) and never checks `course.visibility` or `course.status`, allowing any tenant member (e.g., a `STUDENT`) to self-enroll into `PRIVATE` or `DRAFT` courses.
- **Concrete Impact**: Public disclosure of unpublished `DRAFT`, `UNLISTED`, and `ARCHIVED` courses; unauthorized self-enrollment into `PRIVATE` courses; and memory/DB exhaustion on `/courses`.
- **Defensive Remediation**:
  - Require `visibility === 'PUBLIC'` and `status === 'PUBLISHED'`/`'ACTIVE'` for public catalog listings and public self-enrollment (`UNLISTED` accessible only by direct slug/ID if intended, never in catalog lists).
  - Restrict internal self-enrollment to `PUBLIC` active courses (with verified payment/invitation rules).
  - Implement SQL-level `LIMIT`/`OFFSET` (capped at e.g. `100`) and `JOIN tenants` in `DrizzleCourseRepository`.

#### `[BE-10]` Missing Rate Limiting, Brute-Force Protections, & Security Headers
- **Severity**: High
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/package.json:14-22` (dependencies)
  - `apps/api/src/index.js:20-39` (Fastify initialization & hooks)
  - `apps/api/src/routes/v1/public/index.js:19-672, 866-931`
  - `apps/api/src/routes/v1/internal/index.js:112-153` (`POST /tenants`)
- **Symbols**: `start`, `publicRoutes`
- **Traced Code Path**:
  1. `apps/api/package.json` includes no `@fastify/rate-limit` and no `@fastify/helmet`.
  2. `apps/api/src/index.js:20-23` sets global `bodyLimit: 104857600` (100 MB) for all routes while registering no throttling, brute-force lockout, or security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).
  3. Authentication (`/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/activate`), enrollment (`/storefront/:slug/enroll`), tenant creation (`/tenants`), and base64 media upload (`/media/upload`) endpoints have no rate limits.
- **Concrete Impact**: Brute-force password guessing (including 4-digit temporary passwords from `EnrollStudentUseCase.js:35`), password-reset email bombing / Resend billing exhaustion, credential stuffing, and 100 MB JSON/base64 memory exhaustion DoS.
- **Defensive Remediation**:
  - Install and register `@fastify/rate-limit` (strict per-IP/per-email limits on auth/reset/enroll routes) and `@fastify/helmet`.
  - Lower default `bodyLimit` (e.g., `1MB`) globally and set a higher limit only on upload routes, preferring presigned R2 uploads over base64 JSON.

#### `[BE-11]` Non-Transactional Multi-Write Operations, Broken Outbox Locking, & Token/Progress Race Conditions
- **Severity**: High
- **Category**: Backend Logic / Data Integrity
- **Exact File Paths & Line Ranges**:
  - `packages/infrastructure/database/src/transactions/index.js:2-13` (`executeTransaction`)
  - `packages/infrastructure/database/src/repositories/DrizzleOutboxRepository.js:66-89` (`fetchPending`)
  - `apps/worker/src/outbox/publisher.js:111-138` (`OutboxPublisher.poll`)
  - `packages/domains/identity/application/use-cases/CreateTenantUseCase.js:41-88`
  - `apps/api/src/routes/v1/public/index.js:225-272` (`POST /auth/register`)
  - `packages/domains/identity/application/use-cases/RefreshTokenUseCase.js:16-48`
  - `packages/domains/learning/application/use-cases/MarkLessonCompleteUseCase.js:18-44`
  - `packages/infrastructure/database/src/schema/learning.schema.js:49-65` (`student_progress`)
- **Symbols**: `executeTransaction`, `DrizzleOutboxRepository.prototype.fetchPending`, `RefreshTokenUseCase.prototype.execute`, `MarkLessonCompleteUseCase.prototype.execute`
- **Traced Code Path**:
  1. `executeTransaction` (`transactions/index.js:2-13`) is a mock wrapper (`console.log` only, no `BEGIN`/`COMMIT`/`ROLLBACK`) and is unused across all use cases.
  2. `DrizzleOutboxRepository.fetchPending` (`66-89`) executes `SELECT ... FROM outbox_events WHERE status = 'PENDING' ... FOR UPDATE SKIP LOCKED` outside any transaction; in autocommit mode, row locks release immediately when `SELECT` finishes, before `OutboxPublisher.poll` (`publisher.js:121-126`) enqueues jobs and marks `DISPATCHED`—allowing concurrent outbox pollers to double-enqueue identical jobs.
  3. `RefreshTokenUseCase.js:17-47` reads `session`, calls `revoke(session.id)`, and calls `create(...)` without an atomic `UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL RETURNING id` or transaction, permitting concurrent refresh replay and lacking token-reuse family revocation.
  4. `MarkLessonCompleteUseCase.js:18-44` performs check-then-insert (`findByStudentAndModule` then `save` with new UUID), while `student_progress` (`learning.schema.js:49-65`, `create-neon-tables.js:236-245`) lacks `UNIQUE(student_user_id, lesson_module_id)`, allowing duplicate completion rows under concurrent calls.
  5. `/auth/register` (`public/index.js:225-272`) and `CreateTenantUseCase.js:41-88` perform 5+ sequential writes without a transaction; failure mid-way leaves orphaned `users` / `tenants` without `role_assignments`.
- **Concrete Impact**: Duplicate transactional emails/transcodes, refresh-token race conditions, orphaned user/tenant records on partial failures, and duplicate lesson progress entries.
- **Defensive Remediation**:
  - Implement a real `pg` transaction helper (`BEGIN`/`COMMIT`/`ROLLBACK` on a dedicated pool client) and wrap multi-step provisioning (`/auth/register`, `CreateTenantUseCase`).
  - Atomically claim outbox rows via `UPDATE outbox_events SET status = 'PROCESSING' WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *` or an explicit transaction.
  - Use atomic `UPDATE ... WHERE revoked_at IS NULL RETURNING *` in `RefreshTokenUseCase` with full-user revocation on token reuse; add `UNIQUE(student_user_id, lesson_module_id)` on `student_progress`.

#### `[BE-18]` Cross-Layer UI↔API Contract Mismatches (`NEXT_PUBLIC_API_URL` Proxy Conflict & Client-Only Assessment Architecture)
- **Severity**: High
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/web/lib/api.js:1, 642-655, 668-681, 723-736` (`API_BASE_URL`, `forgotPassword`, `resetPassword`, `enrollStorefront`)
  - `apps/web/next.config.mjs:3-11` (`rewrites`)
  - `apps/web/services/assessment-service.js:39-220, 242-481` (`AssessmentService`)
  - `apps/api/src/routes/v1/internal/academics.js:193` (`GET /academics/courses/:id/modules`)
  - `apps/api/src/routes/v1/internal/learning.js:90-140` (`POST /learning/quizzes/submit`)
- **Symbols**: `nextConfig.rewrites`, `ApiClient`, `AssessmentService`
- **Traced Code Path**:
  1. **`NEXT_PUBLIC_API_URL` base path conflict**: `apps/web/lib/api.js:1` defaults `API_BASE_URL` to `'http://localhost:3001/api/v1'` (expecting `/api/v1` in `NEXT_PUBLIC_API_URL`), whereas `apps/web/next.config.mjs:4,8` computes `const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` and rewrites `/uploads/:path*` to `${apiUrl}/uploads/:path*`. Setting `NEXT_PUBLIC_API_URL=https://api.domain.com/api/v1` breaks all `/uploads/*` media rewrites to `/api/v1/uploads/*` (404), while omitting `/api/v1` breaks all `ApiClient` calls.
  2. **Assessment grading & answer-key contract gap**: `AssessmentService.getStrippedQuizForStudent` (`assessment-service.js:39-96`) and `evaluateQuizAttempt` (`103-220`) assume the API returns raw answer keys (`isCorrect`/`correct`) on `GET /academics/courses/:id/modules` (`academics.js:193`) and accepts a client-computed `score` on `POST /learning/quizzes/submit` (`learning.js:98-113`). Meanwhile, Type B PDF assignment submission and instructor rubric grading (`assessment-service.js:242-481`) have **no backend API routes or database tables at all**—persisting only in browser `localStorage` (`eos_submissions_*`) seeded with hardcoded mock students.
- **Concrete Impact**: Broken media streaming proxy whenever `NEXT_PUBLIC_API_URL` is configured for production, unpersisted assignment submissions/grades lost across browsers, and client-side quiz answer-key/score trust model.
- **Defensive Remediation**:
  - Separate `API_ORIGIN` (for `/uploads/*` rewrite) from `NEXT_PUBLIC_API_URL` (or normalize trailing `/api/v1` in `next.config.mjs`).
  - Move Type A quiz stripping and grading entirely server-side (`POST /learning/quizzes/submit` accepting `{ answers }`), and implement backed Type B assignment submission/grading tables and endpoints.

---

### 4.3 Medium Findings (Backend)

#### `[BE-12]` Unvalidated Upload File Types, Memory Amplification, Unconstrained R2 Presign, & Hardcoded `localhost:3001`
- **Severity**: Medium
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/internal/media.js:22-108, 126, 143` (`POST /upload`, `GET /status/:id`)
  - `apps/api/src/routes/v1/internal/academics.js:181` (`GET /courses/:id/modules`)
  - `packages/infrastructure/storage/src/R2StorageProvider.js:114-125` (`getSignedUrl`)
  - `packages/infrastructure/storage/src/LocalStorageProvider.js:9-20` (`upload`)
  - `packages/domains/media/domain/entities/MediaAsset.js:88` (`MediaAsset.create`)
- **Symbols**: `mediaRoutes`, `R2StorageProvider.prototype.getSignedUrl`, `LocalStorageProvider.prototype.upload`, `MediaAsset.create`
- **Traced Code Path**:
  1. `POST /media/upload` (`media.js:26-44`) does not validate `mimeType` or file extension against `MimeType.js` (`ALLOWED_MIME_TYPES`), permitting `.html`, `.svg`, or `.js` uploads; decodes up to 100 MB base64 in memory; writes videos to `os.tmpdir()/eos_uploads` (`49-52`) without cleanup; swallows DB/Outbox errors (`92-94`) while still returning `201`; and hardcodes `http://localhost:3001/uploads/hls/...` (`55, 126, 143`; also `academics.js:181`).
  2. `R2StorageProvider.getSignedUrl` (`116-120`) constructs `PutObjectCommand` with only `{ Bucket, Key }`, omitting `ContentType` and `ContentLength`, so presigned uploaders can upload arbitrary MIME types and arbitrary sizes to R2.
  3. `MediaAsset.js:88` embeds un-sanitized `props.filename` into `storageKey`; `LocalStorageProvider.js:16` uses `path.join(targetDir, key)` without path containment checks.
- **Concrete Impact**: Stored XSS risk if untrusted HTML/SVG is served from storage/origin, temp disk exhaustion, broken HLS URLs in non-local environments, and bypassed upload type/size constraints on presigned PUTs.
- **Defensive Remediation**:
  - Enforce `MimeType` allowlist and filename sanitization (`path.basename` + strict character allowlist) on both `/upload` and `/presign`; bind `ContentType` in `PutObjectCommand` and enforce size limits.
  - Replace hardcoded `http://localhost:3001` with `API_BASE_URL` / `MEDIA_CDN_URL` configuration; clean up `os.tmpdir()/eos_uploads` and return `500` if DB persistence fails.

#### `[BE-13]` Schema Drift, Uncreated Tables, & Silent Quiz Data Loss in `LessonModule` Updates
- **Severity**: Medium
- **Category**: Backend Logic / Data Integrity
- **Exact File Paths & Line Ranges**:
  - `packages/domains/learning/domain/entities/LessonModule.js:4-68` (`LessonModule`)
  - `packages/infrastructure/database/src/repositories/DrizzleLessonModuleRepository.js:12-51, 122-173`
  - `apps/api/src/routes/v1/internal/academics.js:176-195, 237-275` (`GET/PUT /courses/:id/modules`)
  - `packages/infrastructure/database/src/schema/academics.schema.js:26-52, 93-113` vs `apps/api/create-neon-tables.js:77-117` & `packages/infrastructure/database/src/scripts/sync-neon.js:100-141`
  - `packages/infrastructure/database/src/schema/learning.schema.js:86-121` vs `apps/api/create-neon-tables.js` & `sync-neon.js`
  - `packages/infrastructure/database/src/schema/media.schema.js:4-24` vs `apps/api/src/routes/v1/internal/media.js:62` & `DrizzleCourseRepository.js:81`
- **Symbols**: `LessonModule`, `DrizzleLessonModuleRepository`, `academicsRoutes`
- **Traced Code Path**:
  1. `LessonModule.create()` (`LessonModule.js:43-66`) only copies `courseId, title, contentType, contentUrl, order, status, createdAt, updatedAt` and drops `quiz` and `props`. Even though `DrizzleLessonModuleRepository.toDomain` (`24`) passes `quiz: row.quizJson || row.quiz_json || row.quiz || null`, `LessonModule` discards it (`this.quiz` is `undefined`). Consequently, `GET /academics/courses/:id/modules` (`academics.js:193`) returns `quiz: null`, and `PUT /academics/courses/:id/modules/:moduleId` (`261-266`) overwrites `quiz_json` in PostgreSQL with `NULL` (`DrizzleLessonModuleRepository.save:131`) whenever a module is updated without re-sending `quiz`.
  2. `courses` in `create-neon-tables.js:77-92` and `sync-neon.js:100-115` is missing `organization_id`, `slug`, `short_description`, `thumbnail_file_id`, `level`, `language`, `visibility`, `credits`, and `UNIQUE(tenant_id, code)` present in `academics.schema.js:26-52` and queried by `DrizzleCourseRepository.js:188-206`.
  3. `enrollments` in `create-neon-tables.js:109-117` and `sync-neon.js:133-141` is missing `batch_id`, `updated_at`, and `UNIQUE(student_user_id, course_id)` present in `academics.schema.js:93-113` and written by `DrizzleEnrollmentRepository.js:188`.
  4. `lesson_notes` and `lesson_bookmarks` (`learning.schema.js:86-121`) are absent from `create-neon-tables.js` and `sync-neon.js`.
  5. `media_assets.storage_url` is written by `media.js:62` and joined by `DrizzleCourseRepository.js:81`, but missing from `media.schema.js`.
  6. `enrollments.progress_percentage` is never updated when `MarkLessonCompleteUseCase` records lesson completion.
- **Concrete Impact**: Silent destruction of quiz configurations on module edit; SQL `42703`/`42P01` runtime failures (`column does not exist` / `relation does not exist`) on Neon DBs provisioned via `create-neon-tables.js` or `sync-neon.js`; stale enrollment progress percentages.
- **Defensive Remediation**:
  - Preserve `quiz` (parsed safely if string JSON) and `props` in `LessonModule` entity.
  - Replace ad-hoc `create-neon-tables.js`/`sync-neon.js` DDL with versioned Drizzle SQL migrations (`drizzle-kit`) so schema definitions and deployed tables match 1:1.
  - Recompute/update `enrollments.progress_percentage` inside `MarkLessonCompleteUseCase`.

#### `[BE-14]` Unvalidated UUID Path/Query Parameters & Raw Error Leakage (HTTP 500)
- **Severity**: Medium
- **Category**: Backend Logic / Data Integrity
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/internal/academics.js:204, 243, 282, 305, 349, 463, 525-600`
  - `apps/api/src/routes/v1/internal/media.js:110-149` (`GET /media/status/:id`)
  - `apps/api/src/routes/v1/internal/learning.js:143-180` (`GET /courses/:courseId/progress`)
  - `apps/api/src/routes/v1/public/index.js:196, 1051, 1147`
- **Symbols**: `academicsRoutes`, `mediaRoutes`, `learningRoutes`, `publicRoutes`
- **Traced Code Path**:
  1. Unlike `GET /academics/courses/:id` (`academics.js:61`) and `DrizzleCourseRepository.findById` (`71-72`), `PUT/DELETE /academics/courses/:id/modules/:moduleId`, `PATCH/DELETE /academics/enrollments/:id`, `GET /media/status/:id`, and `GET /learning/courses/:courseId/progress` pass unvalidated `:id`/`:moduleId`/`:courseId` strings directly to PostgreSQL `uuid` columns, causing PostgreSQL `22P02` (`invalid input syntax for type uuid`) unhandled exceptions.
  2. Catch blocks in `media.js:147` and `public/index.js:196, 1051, 1147` return raw `err.message` in HTTP `500` responses.
- **Concrete Impact**: Unhandled 500 errors and internal PostgreSQL schema/error detail disclosure on malformed IDs.
- **Defensive Remediation**:
  - Enforce Fastify JSON Schema `{ type: 'string', format: 'uuid' }` on all UUID route/query parameters and return generic error messages on `500` responses.

#### `[BE-15]` Auth Session, Password Hygiene, & Email HTML Injection Gaps
- **Severity**: Medium
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/public/index.js:55-65, 102-108, 341, 412-426, 497`
  - `apps/api/src/routes/v1/internal/users.js:72-107` (`POST /users/change-password`)
  - `packages/domains/identity/application/use-cases/ChangePasswordUseCase.js:3-43`
  - `apps/api/src/bootstrap/services.js:223-228`
  - `packages/infrastructure/database/src/repositories/DrizzleUserSessionRepository.js:49-58`
  - `apps/worker/src/processors/index.js:260-268, 291, 317`
- **Symbols**: `publicRoutes`, `usersRoutes`, `ChangePasswordUseCase`, `DrizzleUserSessionRepository.prototype.findActiveByRefreshTokenHash`, `PROCESSORS['email.send']`
- **Traced Code Path**:
  1. `POST /auth/login` (`57-59`), `POST /auth/refresh` (`104-106`), and `POST /auth/activate` (`415-416`) return `accessToken` and `refreshToken` in the JSON body alongside `httpOnly` cookies, weakening `httpOnly` XSS isolation if any client stores them.
  2. `POST /auth/activate` (`public/index.js:341`) accepts passwords of `minLength: 6`, inconsistent with `minLength: 8` on `/auth/register`, `/auth/reset-password`, and `/users/change-password`.
  3. `ChangePasswordUseCase` (`ChangePasswordUseCase.js:3-43`, `services.js:223-228`) is not injected with `UserSessionRepository` and does not revoke active refresh sessions after password rotation (unlike `/auth/reset-password` at `public/index.js:661`).
  4. `DrizzleUserSessionRepository.findActiveByRefreshTokenHash` (`51-57`) omits `gt(this.table.expiresAt, new Date())` in its Drizzle ORM query branch (unlike the SQL branch at line `61`).
  5. Email HTML templates in `public/index.js:497` and `apps/worker/src/processors/index.js:260, 291, 317` interpolate `recipientName`, `payload.name`, `payload.courseTitle`, and `payload.courseCode` directly into HTML without escaping.
- **Concrete Impact**: Existing refresh sessions remain valid after password change; expired refresh tokens accepted if Drizzle branch executes; HTML/markup injection in transactional emails.
- **Defensive Remediation**:
  - Revoke all `user_sessions` for the user on `ChangePasswordUseCase`; enforce `minLength: 8` on `/auth/activate`; add expiry check (`gt(expiresAt, now)`) to Drizzle session lookup; HTML-escape all interpolated fields in email templates; omit tokens from JSON bodies for cookie-authenticated web flows.

#### `[BE-16]` TLS Verification Disabled (`rejectUnauthorized: false`) & Unvalidated Tenant Settings
- **Severity**: Medium
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `packages/infrastructure/database/src/client/index.js:62`
  - `packages/infrastructure/queue/src/PostgresQueueProvider.js:50`
  - `apps/api/create-neon-tables.js:12`, `apps/api/seed-neon.js:13`, `apps/api/clear-neon.js:12`, `packages/infrastructure/database/src/scripts/sync-neon.js:36`
  - `apps/api/src/routes/v1/internal/index.js:73-110` (`PATCH/PUT /tenants/current/settings`)
  - `packages/domains/identity/domain/entities/Tenant.js:44-51` (`Tenant.updateSettings`)
  - `apps/api/src/routes/v1/public/index.js:192, 704-725`
- **Symbols**: `DatabaseClient.prototype.connect`, `PostgresQueueProvider.prototype._getQueryClient`, `Tenant.prototype.updateSettings`
- **Traced Code Path**:
  1. All `pg.Pool` / `pg.Client` initializations hardcode `ssl: { rejectUnauthorized: false }`, disabling TLS certificate verification against Neon/PostgreSQL.
  2. `PATCH/PUT /api/v1/internal/tenants/current/settings` (`internal/index.js:82`) accepts any arbitrary `settingsJson: { type: 'object' }`, which `Tenant.updateSettings` (`Tenant.js:44-51`) spreads directly onto `this.props.settingsJson` with no key allowlist, size limit, or URL scheme check (`logoUrl`, `bannerUrl` could contain `javascript:` or `data:` URIs), and `GET /api/v1/public/tenants/:slug` (`192`) / `GET /storefront/:slug` (`704-725`) expose those fields publicly.
- **Concrete Impact**: Susceptibility to active MITM attacks on PostgreSQL connections; arbitrary JSON bloat or unsafe URL injection in public tenant branding endpoints.
- **Defensive Remediation**:
  - Enable `rejectUnauthorized: true` (using Neon/system CA certs or `sslmode=verify-full`) in production.
  - Validate `settingsJson` with strict schema allowlisting (`tagline`, `description`, `primaryColor` hex regex, `accentColor` hex regex, `logoUrl`/`bannerUrl` restricted to `https://` URLs, `socialProof`).

#### `[BE-17]` Worker Resilience, Path Handling, & Dead Legacy Auth Code
- **Severity**: Medium
- **Category**: Backend Logic / Data Integrity
- **Exact File Paths & Line Ranges**:
  - `apps/worker/src/processors/index.js:48-66, 87, 135-139, 170-172, 186, 220-222`
  - `apps/worker/src/workers/index.js:11, 68-113` (`WorkerPool`)
  - `apps/api/src/routes/index.js:1-18` & `apps/api/src/middleware/index.js:1-22`
  - `packages/config/src/index.js:8`
- **Symbols**: `resolveInputVideoPath`, `PROCESSORS['video.transcode']`, `WorkerPool`
- **Traced Code Path**:
  1. `video.transcode` (`processors/index.js:135-139`) generates a synthetic 3-second test video and marks the production `media_assets` row `READY` if the uploaded video cannot be located or downloaded; swallows R2 upload failures (`170-172`) and DB status update failures (`220-222`); and opens/closes a new `DatabaseClient` per job (`87, 186`) instead of reusing a shared pool.
  2. `resolveInputVideoPath` (`48-66`) joins `payload.filename` / `payload.storageKey` without containment checks and accepts arbitrary absolute `payload.filePath`.
  3. `WorkerPool` (`workers/index.js:11, 73-80`) tracks idempotency only in a process-local `Set`, while `OutboxPublisher` emits no idempotency key and no reaper resets `RUNNING` jobs if a worker process crashes mid-transcode.
  4. `apps/api/src/routes/index.js` and `apps/api/src/middleware/index.js` contain dead Express mock auth (`mock-jwt-token-from-api`), and `packages/config/src/index.js:8` retains a hardcoded fallback JWT secret (`'super-secret-key-change-in-production'`).
- **Concrete Impact**: Missing/failed transcodes silently marked `READY` with synthetic test video; lost job errors; stuck `RUNNING` jobs after crashes; maintenance hazard from dead mock-auth modules.
- **Defensive Remediation**:
  - Fail `video.transcode` jobs when source media is missing or R2/DB updates fail; share the worker `dbClient`; confine local paths to `uploads/`; add a stalled-job reaper (`RUNNING` older than N minutes); remove dead Express mock files and hardcoded secret fallbacks.

#### `[BE-19]` Missing Course Publish Lifecycle vs `DRAFT` Default, Cross-Course `batchId` Assignment, & Slug Normalization Drift
- **Severity**: Medium
- **Category**: Backend Logic / Data Integrity
- **Exact File Paths & Line Ranges**:
  - `packages/domains/academics/domain/entities/Course.js:157` (`Course.create` default `status: 'DRAFT'`)
  - `apps/api/src/routes/v1/internal/academics.js:95-158, 521-571` (`POST /courses`, `PATCH /enrollments/:id`)
  - `apps/api/src/routes/v1/public/index.js:181, 695, 747, 805, 893, 948`
- **Symbols**: `Course.create`, `academicsRoutes`, `publicRoutes`
- **Traced Code Path**:
  1. `Course.create` (`Course.js:157`) defaults newly created courses to `status: 'DRAFT'`, and `academics.js` exposes **no endpoint** (`PATCH /courses/:id` or `POST /courses/:id/publish`) to publish or update a course's status or visibility (`BE-09` currently hides this because public routes fail to filter out `DRAFT`).
  2. `PATCH /api/v1/internal/academics/enrollments/:id` (`academics.js:554-560`) forwards `request.body.batchId` directly to `UpdateEnrollmentStatusUseCase` without verifying that `batchId` exists or belongs to `existing.courseId` / `request.tenantId`.
  3. `GET /api/v1/public/tenants/:slug` (`public/index.js:181`) normalizes `request.params.slug` with `slugify(...)`, whereas `/storefront/:slug*` (`695, 747, 805, 893`) and `/courses?tenantSlug=` (`948`) pass raw `slug` without normalization.
- **Concrete Impact**: Once `DRAFT` courses are properly hidden from public storefronts (`BE-09`), newly created courses cannot be published through the API; enrollments can be linked to batches from other courses/tenants.
- **Defensive Remediation**:
  - Add `PATCH /api/v1/internal/academics/courses/:id` and `POST /api/v1/internal/academics/courses/:id/publish` (protected by `authorize('course.update')` + `assertSameTenant`).
  - Verify `batch.courseId === existing.courseId` in `PATCH /academics/enrollments/:id` before updating `batchId`.
  - Consistently normalize/validate tenant slugs across all public routes.

---

## 5. UI Loophole Findings (`UI-01` through `UI-27`)

### 5.1 Critical Findings (UI)

#### `[UI-01]` Missing RBAC Route & Component Guards + Credential/Token Exposure + Unconditional Admin Fetches
- **Severity**: Critical
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/dashboard/layout.js:63-76, 154-164, 399`
  - `apps/web/app/dashboard/tenants/page.js:40-496`
  - `apps/web/app/dashboard/students/page.js:37-1499` (`151-153, 1200-1235`)
  - `apps/web/app/dashboard/courses/[id]/page.js:45-957`
  - `apps/web/app/dashboard/page.js:100-127, 208-210`
  - `apps/web/app/dashboard/settings/page.js:139`
  - `apps/web/components/dashboard/command-palette.jsx:73-182`
- **Symbols**: `DashboardLayout`, `TenantsPage`, `StudentsPage`, `CourseDetailPage`, `DashboardOverviewPage` (`loadAdminData`, `loadStudentData`), `SettingsPage`, `CommandPalette`
- **Traced Code Path**:
  1. `DashboardLayout` only hides sidebar links and the workspace switcher based on `portalMode === "STUDENT"` (`layout.js:63-76, 154-164, 399`).
  2. None of `/dashboard/tenants`, `/dashboard/students`, `/dashboard/courses/[id]`, or `/dashboard/settings` check user role or `portalMode` before rendering admin interfaces or firing admin API requests (`settings/page.js:139` unconditionally calls `ApiClient.getTenantSettings()`).
  3. `DashboardOverviewPage` (`dashboard/page.js:100-127`) unconditionally runs `loadAdminData()` (`getCourses`, `getEnrollments`, `getBatches`) even in `STUDENT` mode, and lines `208-210` (`if (portalMode === "STUDENT" || activeTenant) loadStudentData()`) execute `loadStudentData()` in `ADMIN` mode whenever `activeTenant` is set.
  4. `StudentsPage` (`students/page.js:151-153, 1200-1235`) stores and displays plain `temporaryPassword` values and `/activate?token=...` links (`activationToken`) in the student table/modal.
  5. `CommandPalette` (`command-palette.jsx:73-182`) includes admin routes and creation/enrollment commands regardless of `portalMode`.
- **Concrete Impact**:
  - Students navigating directly to admin routes or using the command palette trigger unauthorized admin requests (`403` error noise, broken layouts) and render admin management screens.
  - Exposing `temporaryPassword` and `activationToken` in client React state/DOM expands credential exposure to XSS, shoulder-surfing, or browser inspection.
  - Competing `loadAdminData()` and `loadStudentData()` calls trigger duplicate API requests and race on `setLoading(false)` in `DashboardOverviewPage`.
- **Defensive Remediation**:
  - Add centralized role/permission route guards in admin pages and `DashboardLayout` (based on verified backend `activeTenant.role` / permissions rather than `localStorage.eos_portal_mode`), redirecting non-admin users to `/dashboard/courses`.
  - Gate `loadAdminData()`, `loadStudentData()`, `getTenantSettings()`, and `CommandPalette` commands strictly on verified role state.
  - Stop returning or rendering `temporaryPassword` in the UI; deliver one-time activation links via out-of-band email only and avoid storing activation tokens in persistent client state.

#### `[UI-02]` Public Checkout Signup Provisions Admin Tenant & Logged-In Self-Enrollment Fails (`403 course.update` / Cross-Tenant Header Mismatch)
- **Severity**: Critical
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/courses/[id]/page.js:167, 234-242, 283-312`
  - `apps/web/app/t/[slug]/courses/page.js:254-337`
  - `apps/web/app/courses/page.js:209, 273`
  - `apps/web/app/dashboard/page.js:222`
  - `apps/web/app/dashboard/courses/page.js:194`
  - `apps/web/app/login/page.js:64`
  - `apps/web/app/dashboard/layout.js:79-82`
  - `apps/api/src/routes/v1/public/index.js:202-280` (`244-250`)
  - `apps/api/src/routes/v1/internal/academics.js:445-451`
  - `apps/api/src/middleware/tenantScope.js:31-35`
  - `packages/infrastructure/database/src/seed/rbac-defaults.js:29`
- **Symbols**: `CourseDetailPage` (`executeEnrollmentAndRedirect`, `handleSignupSubmit`, `handleLoginSubmit`), `TenantCourseWebsitePage` (`handlePurchaseAndEnroll`), `AuthProvider.register`, `ApiClient.registerUser`, `ApiClient.enrollStudent`, `assertPermission`, `tenantScope`
- **Traced Code Path**:
  1. During student checkout signup on `/courses/[id]` (`courses/[id]/page.js:234-242, 283-312`) and `/t/[slug]/courses` (`t/[slug]/courses/page.js:255-285`), the UI calls `useAuth().register(...)` -> `ApiClient.registerUser` (`POST /api/v1/public/auth/register`). On the backend (`public/index.js:202-280`), registration runs `CreateTenantUseCase.execute` (`244-250`), creating a **new tenant** with the signing-up student as an `ADMIN`.
  2. All UI enrollment callers (`courses/[id]/page.js:167`, `t/[slug]/courses/page.js:312`, `courses/page.js:209, 273`, `dashboard/page.js:222`, `dashboard/courses/page.js:194`, `login/page.js:64`) call `ApiClient.enrollStudent({ courseId, ..., studentUserId, studentEmail, studentName })` (`POST /api/v1/internal/academics/enrollments`).
  3. In `apps/api/src/routes/v1/internal/academics.js:445-451`, `isSelfEnrollment` is computed as `!request.body.studentUserId && !request.body.studentEmail`. Because the UI always passes `studentUserId` and `studentEmail`, `isSelfEnrollment` evaluates to `false` and the backend calls `assertPermission(request, reply, 'course.update')`. `STUDENT` lacks `'course.update'` (`rbac-defaults.js:29`), returning **403 Forbidden**.
  4. Simultaneously, `tenantScope.js:31-35` resolves `headers['x-tenant-id']` (`eos_tenant_id` from `localStorage`) before `body.tenantId`, causing cross-tenant 403/404 mismatches when enrolling in a course belonging to another tenant on `/courses` or `/t/[slug]`.
  5. On failure, `courses/[id]/page.js:283-312` and `t/[slug]/courses/page.js:254-337` fall back to writing a synthetic `"std-" + Math.random()...` user in `localStorage.eos_user`, `eos_portal_mode="STUDENT"`, and `eos_enrolled_courses`, then redirect via Next router to `/dashboard/courses?enrolled=...`. Because `AuthProvider` only calls `getMe()` on initial root mount, `AuthProvider.user` remains `null`, so `DashboardLayout:79-82` immediately redirects the user to `/login`.
- **Concrete Impact**: End-to-end public student signup & enrollment is broken against the live backend: new students create bogus admin tenants, logged-in students receive `403`, and fallback paths write fake `localStorage` identities that get rejected by `DashboardLayout`.
- **Defensive Remediation**:
  - Route public/storefront student signup + enrollment through a dedicated public student-checkout endpoint (`POST /api/v1/public/storefront/:slug/enroll` or a dedicated student registration/enrollment use case) rather than tenant-provisioning `/public/auth/register`.
  - For self-enrollment on `POST /api/v1/internal/academics/enrollments`, either omit `studentUserId`/`studentEmail` from self-enroll calls and target the course's tenant (avoiding `x-tenant-id` override of a different active tenant) or introduce a dedicated `POST /api/v1/internal/learning/self-enroll` endpoint scoped by `courseId`.
  - Remove the synthetic `"std-" + Math.random()` `localStorage` fallback and synchronize `AuthContext` (`refreshSession` / `getMe`) before redirecting to `/dashboard/courses`.

#### `[UI-03]` Client-Side Assessment Grading, Unstripped Answer Keys in Browser, & Spoofable `localStorage` Identity
- **Severity**: Critical
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/dashboard/courses/[id]/lesson/[lessonId]/page.js:452-484`
  - `apps/web/lib/api.js:335-384`
  - `apps/web/components/assessments/mcq-quiz-player.jsx:37-39, 134-166`
  - `apps/web/services/assessment-service.js:39-233`
- **Symbols**: `ClassroomLessonPage` (`resolvedQuiz`, `handleQuizAnswer`), `ApiClient.completeLesson`, `ApiClient.getCourseProgress`, `ApiClient.submitQuiz`, `McqQuizPlayer`, `AssessmentService.evaluateQuizAttempt`
- **Traced Code Path**:
  1. `ClassroomLessonPage` (`lesson/[lessonId]/page.js:452-484`) embeds the answer key (`correct: "B"`) in `resolvedQuiz`, evaluates correctness on the client in `handleQuizAnswer`, and posts the client-computed `score` (`100` or `0`) to `ApiClient.submitQuiz`.
  2. `ApiClient.completeLesson` (`lib/api.js:335-351`), `getCourseProgress` (`353-366`), and `submitQuiz` (`368-384`) read `studentUserId` from `localStorage.eos_user` and send it in the request payload/query.
  3. `McqQuizPlayer` (`mcq-quiz-player.jsx:37-39, 134-166`) receives the full `quizConfig` including `isCorrect` flags and `explanation` strings from its parent and calls `AssessmentService.evaluateQuizAttempt` (`assessment-service.js:103-220`), which grades the quiz entirely in browser memory and stores results in `localStorage` without any backend API call.
- **Concrete Impact**: Any student can inspect answer keys (`correct` / `isCorrect`) directly in client memory/network payloads, submit arbitrary scores (`score: 100`) to `submitQuiz`, or tamper with `eos_user` / `eos_quiz_attempts_*` in `localStorage`.
- **Defensive Remediation**:
  - Strip `correct`, `isCorrect`, and `explanation` from quiz payloads delivered to students prior to submission.
  - Move all Type A MCQ grading, attempt counting, and `score` calculation to authenticated backend endpoints, returning only question prompts/options to the student until submission.
  - Have `completeLesson`, `getCourseProgress`, and `submitQuiz` derive the student identity strictly from the server-side authenticated JWT session rather than client `localStorage.eos_user`.

#### `[UI-04]` Cross-Tenant Settings Overwrite During New Tenant Provisioning
- **Severity**: Critical
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/dashboard/tenants/page.js:68-114`
  - `apps/web/lib/api.js:469`
  - `apps/api/src/middleware/tenantScope.js:31-35`
  - `apps/api/src/routes/v1/internal/index.js:73-110`
- **Symbols**: `TenantsPage` (`handleCreateTenant`), `ApiClient.updateTenantSettings`, `tenantScope`, `PATCH /api/v1/internal/tenants/current/settings`
- **Traced Code Path**:
  1. In `TenantsPage` (`tenants/page.js:68-114`), after creating a new tenant, the handler calls `ApiClient.updateTenantSettings(...)` (`PATCH /api/v1/internal/tenants/current/settings`, `lib/api.js:469`) **before** calling `addTenant(created)` / `switchTenant(created)` to update `localStorage.eos_tenant_id`.
  2. `ApiClient` sends the still-active previous tenant's ID in the `x-tenant-id` request header.
  3. Backend `tenantScope.js:31-35` resolves `headers['x-tenant-id']` first, and `internal/index.js:73-110` applies the settings update to `request.tenantId`, ignoring any `tenantId` in the body.
- **Concrete Impact**: Creating a new institution silently mutates/overwrites the branding and settings of the user's **previously active** tenant while leaving the newly created tenant unconfigured.
- **Defensive Remediation**:
  - Switch `eos_tenant_id` (or pass `targetTenantId` explicitly to a tenant-parameterized endpoint / header override after verifying creation response) **before** calling `updateTenantSettings`, or support passing initial branding settings atomically inside `POST /api/v1/internal/tenants`.

#### `[UI-05]` Root-Domain Host Misclassified as Subdomain + Unimported `LockSimple` Runtime Crash
- **Severity**: Critical
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/providers/auth-context.js:121-125, 129-138`
  - `apps/web/app/dashboard/layout.js:23-41, 97-103`
- **Symbols**: `AuthProvider` (`applyTenants`), `DashboardLayout`, `LockSimple`
- **Traced Code Path**:
  1. In `auth-context.js:121-125`, `applyTenants` splits `window.location.hostname` on `'.'` and sets `currentSub = parts[0]` whenever `parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www' && !/^\d+$/.test(parts[0])`.
  2. On any standard 2-label root domain (e.g., `educationos.com`), `parts.length === 2 > 1`, so `currentSub` becomes `'educationos'`.
  3. Lines `129-138` match no tenant with subdomain `'educationos'`, call `setNotEnrolledInSubdomain('educationos')`, set the active tenant `next = null`, and wipe `eos_tenant` and `eos_tenant_id` from `localStorage`.
  4. `DashboardLayout` checks `if (notEnrolledInSubdomain)` (`layout.js:97-103`) and renders `<LockSimple size={28} weight="bold" />` on line `102`, but `LockSimple` is omitted from `@phosphor-icons/react` imports at lines `23-41`.
- **Concrete Impact**: Every authenticated user accessing `/dashboard` on a 2-label production apex domain is locked out of their workspace, loses local tenant selection, and immediately hits an unhandled `ReferenceError: LockSimple is not defined` crash.
- **Defensive Remediation**:
  - Configure an explicit base domain (`NEXT_PUBLIC_ROOT_DOMAIN`) and extract subdomains only when the hostname has a strict prefix label beyond the configured root domain (and ignore apex/`www`).
  - Import `LockSimple` in `apps/web/app/dashboard/layout.js` (or replace with an imported icon) so the lockout state renders safely when genuinely triggered on a valid tenant subdomain.

---

### 5.2 High Findings (UI)

#### `[UI-06]` Open Redirect & Unimported `ApiClient` Crash in `/login`
- **Severity**: High
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/login/page.js:1-24, 58, 64, 71-73, 79`
- **Symbols**: `LoginContent`, `ApiClient` (missing import)
- **Traced Code Path**:
  1. `LoginContent` reads `const redirectParam = searchParams.get("redirect")` (`line 58`) and executes `router.push(redirectParam || "/dashboard")` (`line 79`) without checking that `redirectParam` is a safe internal relative path (`startsWith("/") && !startsWith("//")`).
  2. When `?autoEnroll=` is present, line `64` invokes `await ApiClient.enrollStudent(...)`, but `ApiClient` is not imported in lines `1-24`. Execution throws a `ReferenceError`, which is caught on lines `71-73` and logged via `console.warn`.
- **Concrete Impact**: Crafted login links can redirect authenticated users to external domains post-login, and `?autoEnroll=` flows silently fail on login.
- **Defensive Remediation**:
  - Validate `redirectParam` with a strict allowlist check (`redirectParam.startsWith('/') && !redirectParam.startsWith('//') && !redirectParam.includes('\\')`), falling back to `"/dashboard"`.
  - Import `ApiClient` (and align enrollment call with the fixed self-enrollment contract in `UI-02`).

#### `[UI-07]` React Rules of Hooks Violation Crash in Quiz & Assignment Builder Modals
- **Severity**: High
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/components/assessments/mcq-quiz-builder-modal.jsx:34, 37-107`
  - `apps/web/components/assessments/assignment-builder-modal.jsx:31, 34-95`
  - `apps/web/app/dashboard/courses/[id]/page.js:815-836`
- **Symbols**: `McqQuizBuilderModal`, `AssignmentBuilderModal`, `CourseDetailPage`
- **Traced Code Path**:
  1. Both `McqQuizBuilderModal` (`line 34`) and `AssignmentBuilderModal` (`line 31`) execute `if (!isOpen) return null;` at the top of the component body **before** invoking multiple `useState(...)` hooks (`37-107` and `34-95` respectively).
  2. `CourseDetailPage` (`dashboard/courses/[id]/page.js:815-836`) permanently mounts both modals with `isOpen` initialized to `false`.
  3. Clicking to add or edit an MCQ Quiz or Assignment flips `isOpen` to `true`, executing additional hooks on re-render.
- **Concrete Impact**: Violating React's Rules of Hooks throws a fatal runtime exception (`Rendered more hooks than during the previous render`), completely breaking instructor quiz and assignment creation/editing in the curriculum builder.
- **Defensive Remediation**:
  - Move `if (!isOpen) return null;` **after** all React hook calls in both `McqQuizBuilderModal` and `AssignmentBuilderModal` (or render conditionally in the parent `{isOpen && <Modal ... />}`).

#### `[UI-08]` Unimported `Eye` Icon Runtime Crash in `AssignmentSubmissionPlayer`
- **Severity**: High
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/components/assessments/assignment-submission-player.jsx:8-24, 427`
- **Symbols**: `AssignmentSubmissionPlayer`, `Eye` (missing import)
- **Traced Code Path**:
  1. `apps/web/components/assessments/assignment-submission-player.jsx:8-24` imports icons from `@phosphor-icons/react` without importing `Eye`.
  2. When a student views an assessment with an existing `submission` (outside replacement/revision mode), line `427` renders `<Eye size={14} weight="bold" /> View PDF`.
- **Concrete Impact**: Uncaught `ReferenceError: Eye is not defined` crashes the student Type B assignment player as soon as an existing submission receipt is rendered.
- **Defensive Remediation**:
  - Add `Eye` to the `@phosphor-icons/react` import block at lines `8-24` of `assignment-submission-player.jsx`.

#### `[UI-09]` Unsandboxed Iframes, Unvalidated External URLs (`href`/`src`), & PDF MIME/Extension Logic Bug (`blob:` Persistence)
- **Severity**: High
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/dashboard/courses/[id]/lesson/[lessonId]/page.js:640-644, 673`
  - `apps/web/components/assessments/instructor-grading-workbench.jsx:306, 326-330`
  - `apps/web/app/dashboard/courses/[id]/learn/page.js:287`
  - `apps/web/components/assessments/assignment-submission-player.jsx:107, 137, 212, 422`
  - `apps/web/app/register/page.js:659, 723`
  - `apps/web/app/dashboard/settings/page.js:447`
  - `apps/web/components/ui/tenant-logo.jsx:77`
- **Symbols**: `ClassroomLessonPage`, `InstructorGradingWorkbench`, `StudentLMSPlayerPage`, `AssignmentSubmissionPlayer` (`validateAndSetFile`, `handleSubmit`), `RegisterOnboardingPage`, `SettingsPage`, `TenantLogo`
- **Traced Code Path**:
  1. `ClassroomLessonPage` (`lesson/[lessonId]/page.js:640-644`) and `InstructorGradingWorkbench` (`326-330`) render `currentLesson.contentUrl` and `${activeSubmission.fileUrl}#toolbar=0&navpanes=0` in `<iframe>` tags with no `sandbox` attribute and no URL scheme validation.
  2. `<a href>` download/resource links (`lesson/[lessonId]/page.js:673`, `learn/page.js:287`, `assignment-submission-player.jsx:212, 422`, `instructor-grading-workbench.jsx:306`) and `<img src>` (`register/page.js:659, 723`, `settings/page.js:447`, `tenant-logo.jsx:77`) accept unvalidated URLs without enforcing `http:`/`https:` (or `blob:` for local previews where intended).
  3. `AssignmentSubmissionPlayer` (`assignment-submission-player.jsx:107`) validates dropped/selected files with `if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))`, using `&&` instead of `||`, and stores `URL.createObjectURL(file)` (`line 137`) into `localStorage` as the persistent `fileUrl`.
- **Concrete Impact**: Unvalidated `<a href>` / `<iframe>` `src` values allow `javascript:` link execution or active HTML/script framing inside unsandboxed iframes; non-PDF files renamed `.pdf` bypass client validation, and `blob:` URLs become invalid broken links after page reload or across sessions.
- **Defensive Remediation**:
  - Enforce a shared URL sanitizer allowing only `https:`/`http:` (and relative `/uploads/...` paths) for external URLs; reject `javascript:`, `data:`, and unexpected schemes.
  - Add restrictive `sandbox` attributes (`sandbox="allow-scripts allow-same-origin"` only if strictly required, or `sandbox=""` / PDF viewer via verified storage URLs) and `rel="noopener noreferrer"` on external anchors.
  - Require `file.type === "application/pdf" && file.name.toLowerCase().endsWith(".pdf")` (`!==` joined by `||`), and upload files via backend storage (`MediaUploader` / API storage) instead of persisting `blob:` URLs.

#### `[UI-10]` Cross-Origin Auth/CSRF Cookie Domain & `SameSite=Strict` Mismatch + Missing `credentials`/`x-csrf-token` on Auth/Storefront Mutations
- **Severity**: High
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/middleware/authCookies.js:18-37`
  - `apps/api/src/middleware/csrf.js:21-35`
  - `apps/web/lib/api.js:6-10, 644, 670, 725`
- **Symbols**: `setAuthCookies`, `verifyCsrf`, `readCsrfCookie`, `ApiClient.forgotPassword`, `ApiClient.resetPassword`, `ApiClient.enrollStorefront`
- **Traced Code Path**:
  1. `authCookies.js:18-37` sets `access_token`, `refresh_token`, and `csrf_token` as host-only cookies (no `Domain` attribute); `refresh_token` uses `sameSite: 'strict'` and `path: '/api/v1/public/auth'`, and `csrf_token` is scoped to the API origin.
  2. `ApiClient` reads `csrf_token` via `document.cookie` in `readCsrfCookie()` (`lib/api.js:6-10`), which only sees cookies set on the web origin or shared parent domain. If `apps/web` and `apps/api` run on distinct origins/subdomains without a unified `/api/*` rewrite, `readCsrfCookie()` returns `null`.
  3. Separately, `ApiClient.forgotPassword` (`644`), `ApiClient.resetPassword` (`670`), and `ApiClient.enrollStorefront` (`725`) make `POST` requests without `credentials: 'include'` or `x-csrf-token`. If routed through a same-origin proxy while a user holds an active session cookie, `verifyCsrf` (`csrf.js:21-35`) checks cookie presence and rejects with `403`.
- **Concrete Impact**: Authenticated mutations fail with `403 CSRF token missing` in multi-subdomain/cross-origin deployments; logged-in users triggering `forgotPassword`, `resetPassword`, or `enrollStorefront` via same-origin proxy fail CSRF validation.
- **Defensive Remediation**:
  - Proxy `/api/*` through `apps/web/next.config.mjs` (same-origin) or configure a shared parent cookie `Domain` and `SameSite=Lax` for `refresh_token` across trusted subdomains.
  - Route all `ApiClient` mutating calls through a single request helper that attaches `credentials: 'include'` and `x-csrf-token` consistently (or exempt unauthenticated public auth/storefront endpoints from cookie CSRF checks only when unauthenticated).

#### `[UI-11]` Single-Use Refresh Token Concurrency Race Across Parallel Mount Requests
- **Severity**: High
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/web/lib/api.js:36-70`
  - `apps/web/app/dashboard/page.js:104`
  - `apps/web/app/dashboard/students/page.js:77`
  - `apps/web/app/dashboard/settings/page.js:124`
- **Symbols**: `ApiClient._tryRefreshAccessToken`, `ApiClient.request`
- **Traced Code Path**:
  1. Dashboard pages (`dashboard/page.js:104`, `students/page.js:77`, `settings/page.js:124`) invoke multiple `ApiClient` requests concurrently via `Promise.all` / simultaneous effects on mount.
  2. When the short-lived `access_token` is expired, each concurrent `401` independently invokes `_tryRefreshAccessToken()` (`lib/api.js:36-70`), which lacks an in-flight singleton promise lock.
- **Concrete Impact**: Concurrent refresh requests race against single-use rotating refresh tokens on the backend: the first call rotates the token and subsequent concurrent calls fail with `401`, potentially logging the user out mid-session.
- **Defensive Remediation**:
  - Store a module-scoped `refreshInFlightPromise` in `apps/web/lib/api.js` so concurrent `401` responses await the same single refresh request before retrying.

#### `[UI-12]` Edge Proxy Static Dot-Bypass, Unvalidated `Host` Header, & Query-Parameter Drop on Subdomain Rewrites
- **Severity**: High
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/web/proxy.js:3-38, 45-51, 54-64, 66-67, 80-81`
- **Symbols**: `getSubdomain`, `proxy`, `config`
- **Traced Code Path**:
  1. `proxy(req)` checks `if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) return NextResponse.next();` (`45-51`) **before** the `/dashboard` auth cookie guard (`54-64`). Furthermore, the guard only checks presence of `access_token`, `refresh_token`, or `csrf_token` cookies without cryptographic verification.
  2. `getSubdomain(host)` (`3-38, 66-67`) splits the raw `host` request header without validating against configured trusted domains or stripping disallowed characters.
  3. On subdomain rewrites (`80-81`), `const rewriteUrl = new URL(targetPath, req.url);` constructs a clean path without appending `req.nextUrl.search`.
- **Concrete Impact**: Any `/dashboard/...` path containing a dot bypasses edge redirect gating; stale/forged cookie names also pass the edge check; unvalidated `Host` values directly feed `/org/${subdomain}` rewrite targets; query parameters (e.g., `?ref=`, `?utm_*`, filters) are silently stripped on all tenant subdomain requests.
- **Defensive Remediation**:
  - Replace `pathname.includes('.')` with an explicit static-extension / public-file allowlist, keep `/dashboard` protection independent of dots, and verify JWT signatures/expiry in server components or edge-compatible verification.
  - Validate extracted subdomains against strict DNS label regex (`^[a-z0-9-]+$`) and known root hostnames, and preserve `req.nextUrl.search` when constructing `rewriteUrl`.

#### `[UI-13]` Post-Activation Session Desync & False-Success Tenant Provisioning in Onboarding
- **Severity**: High
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/activate/page.js:79-91`
  - `apps/web/app/register/page.js:104, 139, 192-235`
  - `apps/web/providers/auth-context.js:228`
- **Symbols**: `ActivateContent` (`handleSubmit`), `RegisterOnboardingPage` (`triggerSlugCheck`, `handleNext`, `handleProvision`), `AuthProvider.register`
- **Traced Code Path**:
  1. `ActivateContent` (`activate/page.js:79-91`) calls `ApiClient.activateAccount(...)` and redirects directly to `/dashboard/courses` without updating `AuthContext` (`user` remains `null`), so `DashboardLayout` redirects the user to `/login`.
  2. In `RegisterOnboardingPage` (`register/page.js:192-235`), `AuthProvider.register` catches API errors internally and returns `{ success: false }` without throwing (`auth-context.js:228`). `handleProvision` ignores `res.success === false`, and in both the `try` and `catch` blocks invokes `saveCustomInstitution(...)` and `setProvisionedTenant(...)`.
  3. Additionally, `handleNext` (`register/page.js:139`) does not block advancing while `slugStatus === "checking"`, and `triggerSlugCheck` (`104`) marks the slug `"available"` if the availability request errors out.
- **Concrete Impact**: Newly activated students are immediately kicked to `/login` instead of their courses; failed tenant registrations display a false-success "Provisioned" confirmation screen and save nonexistent institutions locally.
- **Defensive Remediation**:
  - Refresh `AuthContext` (`getMe()` / `setAuthSession`) in `activate/page.js` before redirecting, or redirect to `/login?activated=1` if activation does not issue session cookies.
  - In `register/page.js`, check `if (!res?.success)` and surface the real error instead of running `saveCustomInstitution` / `setProvisionedTenant` on failure or inside `catch`; block `handleNext` during `"checking"` and treat network errors in `triggerSlugCheck` as `"error"` rather than `"available"`.

---

### 5.3 Medium Findings (UI)

#### `[UI-14]` MCQ Quiz Storage Key Mismatch & Countdown Timer Stale-Closure Auto-Submit
- **Severity**: Medium
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/services/assessment-service.js:103-233` (`213, 227`)
  - `apps/web/components/assessments/mcq-quiz-player.jsx:74-91`
  - `apps/web/components/assessments/mcq-quiz-builder-modal.jsx`
- **Symbols**: `AssessmentService.evaluateQuizAttempt`, `AssessmentService.getStudentQuizAttempts`, `McqQuizPlayer`, `McqQuizBuilderModal`
- **Traced Code Path**:
  1. `evaluateQuizAttempt` (`assessment-service.js:213`) saves attempts under key `eos_quiz_attempts_${quizConfig.id || "default"}_${studentUserId}`, whereas `getStudentQuizAttempts` (`line 227`) reads `eos_quiz_attempts_${moduleId || "default"}_${studentUserId}` (`McqQuizBuilderModal` never assigns `quizConfig.id`).
  2. In `McqQuizPlayer` (`mcq-quiz-player.jsx:74-91`), the countdown `useEffect` (deps `[timeLimitSeconds, isTestSubmitted]`) triggers `handleAutoSubmit()` inside `setTimeRemaining`'s state updater callback.
- **Concrete Impact**: Attempt history and `maxAttempts` enforcement fail to find prior attempts due to mismatched storage keys (`"default"` vs `moduleId`); when a timed quiz expires, `handleAutoSubmit()` closes over the initial `selectedAnswers` (`{}`), submitting zero answers regardless of the student's selections.
- **Defensive Remediation**:
  - Persist attempts exclusively via backend assessment endpoints keyed by `moduleId` (and align any local cache key to `moduleId`).
  - Use a `selectedAnswersRef` (or separate effect watching `timeRemaining === 0`) outside the `setTimeRemaining` updater so auto-submit always reads current selections and avoids impure side effects inside state updaters.

#### `[UI-15]` Grading Workbench Ignores Custom Rubric & Course Detail Seeds Synthetic Submissions
- **Severity**: Medium
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/components/assessments/instructor-grading-workbench.jsx:75-84`
  - `apps/web/app/dashboard/courses/[id]/page.js:290`
  - `apps/web/services/assessment-service.js`
- **Symbols**: `InstructorGradingWorkbench`, `CourseDetailPage`, `AssessmentService.getAssignmentSubmissions`
- **Traced Code Path**:
  1. `InstructorGradingWorkbench` (`75-84`) checks `targetModule?.rubricCriteria`, whereas `AssignmentBuilderModal` saves custom criteria under `module.quiz.rubricCriteria`.
  2. `CourseDetailPage` (`dashboard/courses/[id]/page.js:290`) calls `AssessmentService.getAssignmentSubmissions(courseId)` without a `moduleId` argument, causing `AssessmentService` to seed 3 mock submissions into `localStorage` under `eos_submissions_${courseId}_all`.
- **Concrete Impact**: Instructors grading Type B assignments always see default rubric criteria instead of the assignment's configured rubric, and see 3 synthetic demo submissions injected into live courses.
- **Defensive Remediation**:
  - Read `targetModule?.quiz?.rubricCriteria ?? targetModule?.rubricCriteria` consistently and migrate submission listings to real backend API endpoints without synthetic seeding in production views.

#### `[UI-16]` Storefront Branding Settings Schema Mismatch (`settings.*` vs `settingsJson.branding.*`)
- **Severity**: Medium
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/public/index.js:704-725`
  - `apps/web/app/register/page.js:178-189`
  - `apps/web/app/dashboard/tenants/page.js:78-90`
  - `apps/web/app/dashboard/settings/page.js:270-285`
  - `apps/web/app/org/[slug]/StorefrontClient.jsx:78`
- **Symbols**: `GET /api/v1/public/storefront/:slug`, `RegisterOnboardingPage`, `TenantsPage`, `SettingsPage`, `StorefrontClient`
- **Traced Code Path**:
  1. `register/page.js:178-189`, `tenants/page.js:78-90`, and `settings/page.js:270-285` persist branding fields (`tagline`, `logoUrl`) nested inside `settingsJson.branding.*`.
  2. Backend public storefront route `public/index.js:704-725` reads top-level `settings.tagline`, `settings.logoUrl`, and `settings.primaryColor`, returning empty/default values to `StorefrontClient.jsx:78`.
- **Concrete Impact**: Custom taglines and logos configured during onboarding or in workspace settings do not appear on `/org/[slug]` public storefronts.
- **Defensive Remediation**:
  - Align both sides on a single canonical `settingsJson` schema (e.g., read `settings.branding?.tagline ?? settings.tagline` and `settings.branding?.logoUrl ?? settings.logoUrl` on the backend storefront projection).

#### `[UI-17]` Course Price Unit Mismatch (Cents vs Whole Dollars) Across Public Pages
- **Severity**: Medium
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/api/src/routes/v1/public/index.js:774, 856, 1009, 1129`
  - `apps/web/app/org/[slug]/StorefrontClient.jsx:199`
  - `apps/web/app/org/[slug]/courses/[courseId]/CourseDetailClient.jsx:192`
  - `apps/web/app/courses/[id]/page.js:744`
  - `apps/web/app/t/[slug]/courses/page.js:844`
- **Symbols**: `StorefrontClient`, `CourseDetailClient`, `CourseDetailPage`, `TenantCourseWebsitePage`
- **Traced Code Path**:
  1. Backend public routes (`public/index.js:774, 856, 1009, 1129`) expose `price` in integer cents (e.g., `4900`).
  2. `/org/[slug]/StorefrontClient.jsx:199` and `CourseDetailClient.jsx:192` divide by `100` (`$49.00`), while `/courses/[id]/page.js:744` and `/t/[slug]/courses/page.js:844` render `${course.price || 49}` verbatim (`$4900`).
- **Concrete Impact**: Identical courses display 100x inflated prices (`$4900` instead of `$49.00`) on `/courses/[id]` and `/t/[slug]/courses`.
- **Defensive Remediation**:
  - Standardize on integer cents (`priceCents`) from the API and apply a single shared `formatPriceCents()` formatter (`(price / 100).toFixed(2)`) across all storefront, catalog, and checkout pages.

#### `[UI-18]` `NEXT_PUBLIC_API_URL` `/api/v1` vs `/uploads` Path Contract Mismatch & Hardcoded `localhost:3001`
- **Severity**: Medium
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/web/lib/api.js:1`
  - `apps/web/next.config.mjs:4, 8`
  - `apps/web/lib/course-media.js:117-118`
  - `apps/web/components/media/HlsVideoPlayer.jsx:30-31`
  - `apps/web/app/dashboard/courses/[id]/lesson/[lessonId]/page.js:89, 102, 114, 248`
- **Symbols**: `API_BASE_URL`, `rewrites`, `resolveCourseThumbnail`, `HlsVideoPlayer`, `ClassroomLessonPage`
- **Traced Code Path**:
  1. `lib/api.js:1` expects `NEXT_PUBLIC_API_URL` to include `/api/v1` (`'http://localhost:3001/api/v1'`).
  2. `next.config.mjs:4, 8`, `course-media.js:117-118`, and `HlsVideoPlayer.jsx:30-31` append `/uploads/...` directly to `NEXT_PUBLIC_API_URL`, generating `/api/v1/uploads/...`.
  3. `ClassroomLessonPage` (`lesson/[lessonId]/page.js:89, 102, 114, 248`) also hardcodes `http://localhost:3001` strings.
- **Concrete Impact**: Uploaded thumbnails, PDFs, and HLS video manifests fail to load when `NEXT_PUBLIC_API_URL` points to `/api/v1` (or outside localhost).
- **Defensive Remediation**:
  - Split `NEXT_PUBLIC_API_ORIGIN` (e.g., `http://localhost:3001`) from `API_BASE_URL` (`${ORIGIN}/api/v1`), derive `/uploads/...` from the origin (or via relative Next rewrite), and eliminate hardcoded `localhost:3001` URLs in `lesson/[lessonId]/page.js`.

#### `[UI-19]` `ApiClient.getBatches()` Called Without `courseId` Always Returns Empty Array
- **Severity**: Medium
- **Category**: Cross-Layer UI–API Contract
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/dashboard/students/page.js:93`
  - `apps/web/app/dashboard/page.js:107`
  - `apps/api/src/routes/v1/internal/academics.js:313`
- **Symbols**: `StudentsPage`, `DashboardOverviewPage`, `GET /api/v1/internal/academics/batches`
- **Traced Code Path**:
  1. Both `StudentsPage` (`93`) and `DashboardOverviewPage` (`107`) invoke `ApiClient.getBatches()` with no `courseId`.
  2. `academics.js:313` returns `[]` whenever `request.query.courseId` is absent.
- **Concrete Impact**: Batch selectors, counts, and cohort filters in the dashboard remain permanently empty.
- **Defensive Remediation**:
  - Either allow `GET /api/v1/internal/academics/batches` to list all batches scoped to `request.tenantId` when `courseId` is omitted, or fetch batches per selected `courseId` from the UI.

#### `[UI-20]` Non-Functional Course Settings Form, Optimistic State Updates on Error, & Duplicate UI Header
- **Severity**: Medium
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/dashboard/courses/[id]/page.js:133-145, 162-175, 195-209, 250, 711-742, 750-753`
  - `apps/web/app/dashboard/students/page.js:203-250`
- **Symbols**: `CourseDetailPage`, `StudentsPage`
- **Traced Code Path**:
  1. `CourseDetailPage` Settings tab (`711-742`) renders uncontrolled `defaultValue` inputs and a Save `<Button>` without any `onClick` or `onSubmit` handler.
  2. Lines `750-753` render duplicate `"Add ... Add "` header text.
  3. Curriculum mutations (`133-145, 162-175, 195-209, 250`) and student management handlers (`students/page.js:203-250`) update React state even when `ApiClient` returns `{ success: false }`.
- **Concrete Impact**: Saving course settings silently does nothing; failed API writes masquerade as persisted changes in UI state until reload.
- **Defensive Remediation**:
  - Wire controlled state and an `ApiClient.updateCourse(...)` submit handler in the Course Settings tab, check `res.success` before mutating client state in `CourseDetailPage` and `StudentsPage`, and remove the duplicate header text.

#### `[UI-21]` `MediaUploader` Polling Interval Leak/Stale `hlsUrl` & `HlsVideoPlayer` Stale Mute Listener
- **Severity**: Medium
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/components/ui/media-uploader.jsx:53-71`
  - `apps/web/components/media/HlsVideoPlayer.jsx:330-333`
- **Symbols**: `MediaUploader` (`pollTranscodeStatus`), `HlsVideoPlayer`
- **Traced Code Path**:
  1. `MediaUploader` (`53-71`) creates a `setInterval` in `pollTranscodeStatus` with no unmount cleanup and fails to pass the resolved `hlsUrl` back up to parent state when status transitions to `READY`.
  2. `HlsVideoPlayer` (`330-333`) attaches a `window` `keydown` listener with dependency array `[togglePlay]`, capturing stale `isMuted` and `volume` values in its closure.
- **Concrete Impact**: Background polling continues after modal/component unmount and parent forms do not receive the transcoded HLS URL; pressing `m` to mute locks `HlsVideoPlayer` so `m` cannot unmute.
- **Defensive Remediation**:
  - Store the interval ID in a `useRef` cleared in a `useEffect` unmount cleanup and invoke `onUploadComplete` with the finalized `hlsUrl` on `READY`.
  - Include `isMuted` and `volume` (or a ref/functional updater) in `HlsVideoPlayer`'s keyboard listener logic.

#### `[UI-22]` Dual LMS Player Desync, `?enrolled=` Badge Spoofing, & Unguarded Division
- **Severity**: Medium
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/dashboard/courses/[id]/learn/page.js:38-139`
  - `apps/web/app/dashboard/courses/page.js:103-116, 168-174, 567`
  - `apps/web/app/dashboard/courses/[id]/lesson/[lessonId]/page.js:89-115, 486`
- **Symbols**: `StudentLMSPlayerPage`, `CoursesContent`, `ClassroomLessonPage`
- **Traced Code Path**:
  1. `StudentLMSPlayerPage` (`learn/page.js:38-139`) never calls `ApiClient.getCourseProgress`, diverging from `ClassroomLessonPage`.
  2. `ClassroomLessonPage` puts `lessonId` in the curriculum fetch `useEffect` dependency array (causing full curriculum reload on every lesson switch) and performs an unguarded division by `allLessons.length` at line `486` (mitigated only when `modules.length === 0` triggers `defaultModules`, still producing `NaN` if `modules` is non-empty with zero lessons).
  3. `CoursesContent` (`dashboard/courses/page.js:103-116, 168-174, 567`) treats `?enrolled=` query param as enrolled status and never populates `firstLessonId` (leaving `'first'`).
- **Concrete Impact**: Progress state diverges between `/learn` and `/lesson/[lessonId]`, students visiting `/dashboard/courses?enrolled=<id>` appear enrolled regardless of backend state, and "Start Learning" links route to invalid `'first'` lesson IDs.
- **Defensive Remediation**:
  - Consolidate to one LMS player or share `getCourseProgress` state, remove `lessonId` from curriculum fetch dependencies, guard `allLessons.length > 0`, derive enrollment status strictly from backend enrollment records, and resolve the first real module/lesson ID.

#### `[UI-23]` Command Palette Stale Tenant Course Cache & Ignored Query Actions
- **Severity**: Medium
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/components/dashboard/command-palette.jsx:37-49, 130, 140`
- **Symbols**: `CommandPalette`
- **Traced Code Path**:
  1. `CommandPalette` fetches `ApiClient.getCourses()` once on mount (`[]` dependencies, `37-49`), never re-fetching when `activeTenant` changes via `switchTenant`.
  2. Quick actions navigate to `/dashboard/courses?action=new` (`130`) and `/dashboard/students?action=enroll` (`140`), neither of which is read by `dashboard/courses/page.js` or `dashboard/students/page.js`.
- **Concrete Impact**: Switching tenants shows stale courses from the previous tenant in the command palette; quick-create/enroll commands do not open their target modals.
- **Defensive Remediation**:
  - Key the course fetch `useEffect` on `activeTenant?.id` and wire `useSearchParams()` handlers in `courses/page.js` and `students/page.js` (or remove unused query params).

---

### 5.4 Low Findings (UI)

#### `[UI-24]` Global DOM & ScrollTrigger Leaks in Carousel and Parallax Components
- **Severity**: Low
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/components/ui/apple-cards-carousel.tsx:163-178`
  - `apps/web/components/ui/parallax-scrolling.tsx:68`
- **Symbols**: `Card`, `ParallaxComponent`
- **Traced Code Path**:
  1. `Card` (`apple-cards-carousel.tsx:163-178`) attaches a global `Escape` `keydown` listener and sets `document.body.style.overflow = "auto"` even when `open === false`, invoking `onCardClose(index)` across closed cards (`useOutsideClick` on line `180` guards on `!ref.current` and only triggers when open).
  2. `ParallaxComponent` (`68`) runs `ScrollTrigger.getAll().forEach(st => st.kill())` on unmount, destroying ScrollTrigger instances belonging to other components.
- **Concrete Impact**: Pressing Escape or having closed carousel cards clobbers unrelated modal scroll locks and carousel indices; navigating away from parallax sections kills sibling scroll animations.
- **Defensive Remediation**:
  - Only attach the `Escape` listener and manage `body.style.overflow` inside the effect when `open === true`; scope GSAP cleanup via `gsap.context()` (`ctx.revert()`).

#### `[UI-25]` Landing Page Renders Template Demo Pricing with Dead CTAs + Synthesized Dashboard Metrics
- **Severity**: Low
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/page.js:172`
  - `apps/web/components/ui/pricing-5/demo.tsx:1-67`
  - `apps/web/components/dashboard/analytics-hub.jsx:78-111`
  - `apps/web/components/dashboard/dashboard-schedule-sidebar.jsx:1-218`
  - `apps/web/components/dashboard/dashboard-task-list.jsx:1-157`
  - `apps/web/components/dashboard/performance-bar-chart.jsx:1-174`
- **Symbols**: `Home`, `Pricing5Demo`, `AnalyticsHub`, `DashboardScheduleSidebar`, `DashboardTaskList`, `PerformanceBarChart`
- **Traced Code Path**:
  - `app/page.js:172` embeds `Pricing5Demo`, whose CTA buttons have no `onClick`/`Link` and display placeholder copy. `AnalyticsHub` (`78-111`) and the sidebar/task/chart widgets display hardcoded or synthesized metrics and non-functional search/month controls.
- **Concrete Impact**: Visitors cannot convert from the landing page pricing section, and dashboard users see synthetic metrics alongside real course/student counts.
- **Defensive Remediation**:
  - Replace `Pricing5Demo` with real plan tiers wired to `/register?plan=...`, and either bind dashboard analytics/schedule/tasks to backend endpoints or explicitly label/hide unimplemented widgets.

#### `[UI-26]` Broken `/docs` Link, Inconsistent Password Minimums, & Direct-Path `/org/[slug]` Link Escapes
- **Severity**: Low
- **Category**: UI / Validation / State Edge Cases
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/dashboard/settings/page.js:229, 1036`
  - `apps/web/app/activate/page.js:67`
  - `apps/web/app/register/page.js:127`
  - `apps/web/app/reset-password/page.js:72`
  - `apps/web/app/org/[slug]/layout.js:38`
  - `apps/web/app/org/[slug]/StorefrontClient.jsx:205`
  - `apps/web/app/org/[slug]/courses/[courseId]/CourseDetailClient.jsx:50`
- **Symbols**: `SettingsPage`, `ActivateContent`, `RegisterOnboardingPage`, `ResetPasswordContent`, `OrgLayout`, `StorefrontClient`, `CourseDetailClient`
- **Traced Code Path**:
  - `settings/page.js:1036` renders `<a href="/docs" target="_blank">` (no `/docs` route exists in `apps/web/app/`).
  - Password minimums diverge across flows: `6` chars (`activate/page.js:67`), `8` chars (`register/page.js:127`, `reset-password/page.js:72` where checklist items are not enforced, `settings/page.js:229`) vs documented 12-char complexity policy.
  - `app/org/[slug]` components link to `/courses/${course.id}` and `/`, which work under subdomain rewrites (`proxy.js`) but break out of `/org/[slug]` when accessed via direct path URLs.
- **Concrete Impact**: Dead 404 documentation link, inconsistent password validation rejections, and broken storefront navigation on direct `/org/[slug]` URLs.
- **Defensive Remediation**:
  - Implement `/docs` or remove the dead link, align all client password schemas with the backend policy, and compute link prefixes in `/org/[slug]` relative to hostname vs path routing.

#### `[UI-27]` Developer Email Exposure in Forgot-Password UI & Dead Legacy Mock/Demo Files
- **Severity**: Low
- **Category**: Security / Auth / Access Control
- **Exact File Paths & Line Ranges**:
  - `apps/web/app/forgot-password/page.js:171-189`
  - `apps/web/providers/AuthProvider.jsx:1-28`
  - `apps/web/services/api.js:1-17`
  - `apps/web/components/multi-step-loader-demo.tsx:1-62`
- **Symbols**: `ForgotPasswordContent`, `AuthProvider` (legacy), `fetchApi`, `MultiStepLoaderDemo`
- **Traced Code Path**:
  - `forgot-password/page.js:171-189` exposes hardcoded developer email (`sharma.ankush9193@gmail.com`), `onboarding@resend.dev`, and `devResetUrl` banner text in production bundle code. Legacy `providers/AuthProvider.jsx` (`admin@educationos.com`), `services/api.js`, and `multi-step-loader-demo.tsx` (placeholder demo copy) remain unreferenced in `apps/web/`.
- **Concrete Impact**: Leaks developer personal contact info and internal email setup details in client bundles and clutters code maintenance.
- **Defensive Remediation**:
  - Remove hardcoded developer email / provider hints from `forgot-password/page.js` (gate any dev reset preview strictly behind `process.env.NODE_ENV === 'development'` with generic messaging) and delete dead mock/demo files (`providers/AuthProvider.jsx`, `services/api.js`, `components/multi-step-loader-demo.tsx`).

---

## 6. Prioritized Pre-Release Remediation Roadmap

### Remediation progress

Roadmap checkmarks indicate implemented fixes. Staging verification and remaining work are tracked below.

| Finding | Changes completed | Open work |
|---|---|---|
| `BE-01` | Both enrollment endpoints omit credentials. Activation links go through the email outbox for newly provisioned students and are consumed by a conditional password update. Legacy activation links are rejected. | Previously invited students with legacy links need to use password recovery. Payment verification for self-enrollment remains open. |
| `BE-05` | Learning routes enforce tenant membership, permission and active enrollment. Course module reads also require enrollment unless the caller can publish lessons for that course's scope. | Quiz changes are tracked under `UI-03`. |
| `BE-02` | Upload serving verifies tenant staff access or active course enrollment for private files, HLS playlists and segments. Browser playback uses same-origin links, and new remote uploads and HLS output require a private R2 bucket. Published course thumbnails remain public. | Configure `R2_PRIVATE_BUCKET_NAME`, disable public access to legacy media, and verify playback with staging PostgreSQL and R2. |
| `BE-03` | Transcoding gets tenant ownership from the persisted asset and only updates video lessons in that tenant. It targets an explicit module ID or an exact recorded source URL for direct uploads. | Verify the update against staging PostgreSQL with lessons in two tenants. |
| `BE-04` | Confirmation checks the asset's tenant before saving and forwards the verified tenant to the worker. | Verify the presign, confirm and transcode flow with staging object storage. |
| `UI-01` | The dashboard uses the verified workspace role for management pages, settings and command palette actions. Overview requests are scoped to the active workspace and load either staff metrics or the student's own enrollments. Enrollment credentials are delivered by email. | Verify role changes and workspace switching in a signed-in browser. |
| `UI-04` | New workspace settings requests explicitly target the created tenant, including after session refresh. The API rejects mismatched targets. A local regression test verifies that the previous workspace keeps its branding. | — |
| `UI-05` | Auth and proxy share hostname detection. Apex and preview hosts keep normal workspace selection. Tenant hosts route dashboard and sign-in to the shared app, and the access-restricted screen imports its lock icon. | Verify the signed-in flow on apex and tenant hosts in a browser. |
| `UI-06` | Login accepts same-origin paths and falls back to the dashboard for other destinations. Auto-enrollment uses the authenticated student and reports success only after the API confirms it. | Public checkout and payment verification remain under `UI-02`. |
| `UI-07` | Quiz and assignment forms mount only while their modals are open, with fresh state for the selected assessment. A local Chrome smoke test opened, closed, and reopened both builders. | — |
| `UI-08` | Submission receipts import the PDF link's eye icon and notify completion once per loaded passing receipt. A local Chrome smoke test verified receipt rendering and cleared it when switching assignments. | PDF storage and download persistence remain under `UI-09` and `BE-18`. |
| `BE-06` | Media assets and quiz submissions now persist through the API's database client. | Batch and organization repositories still need persistence fixes. |
| `BE-08` | Forgot-password always returns a generic acknowledgment for valid addresses. The worker sends one email using validated `APP_URL`, and new links carry the token in a fragment. The browser verifies it in a POST body, and API logs omit URL query strings. | Set the same public HTTPS `APP_URL` on the API and worker and verify delivery in staging. |
| `BE-17` | Jobs with a missing source now fail instead of publishing synthetic content. | Worker stalled-job recovery remains open. |
| `UI-03` / `BE-13` | Students submit selected option IDs. The API grades against the stored quiz, records the result and completes the lesson after a passing score. Course module responses omit answer keys and rationales for students. Both legacy and multi-question quizzes are supported. Lesson edits preserve the stored quiz. | Verify with staging PostgreSQL and both student views in a browser. Attempt limits and timers remain browser-side. Historical scores and completions still need review. |

Local checks cover upload serving, tenant scoping, media repository queries and FFmpeg output. PostgreSQL and R2 were stubbed where used by these tests. The API provisioning script now includes the `lesson_modules.deleted_at` column used by the worker's update query. Check that column in existing deployments before rolling out the worker.

### P0 — Immediate Release Blockers (Critical Security, Data Corruption, & Fatal Crashes)

1. **Eliminate Activation Token Leak & Unauthenticated Takeover (`BE-01`, `UI-02`)**:
   - [x] Strip `activationToken`, `activationUrl`, and `temporaryPassword` from `POST /public/storefront/:slug/enroll` and `POST /internal/academics/enrollments`.
   - [x] Issue single-use activation links only for newly provisioned students, store the nonce hash in the database, and deliver links through the email outbox. Reject legacy activation links.
   - [ ] Introduce dedicated public student checkout + internal self-enroll endpoints and remove `localStorage` synthetic `"std-..."` fallback identities.
2. **Patch Arbitrary File Read & Media Access Control (`BE-02`)**:
   - [x] Enforce filesystem containment in `GET /uploads/*` before serving files.
   - [x] Authorize playback and downloads through the API, including every HLS playlist and segment.
   - [ ] Set `API_ORIGIN` for the web deployment and `R2_PRIVATE_BUCKET_NAME` for the API and worker. Disable public URLs, custom domains and public CDN caching on the private bucket. Close or migrate legacy public media origins and invalidate previously issued download links and cached media. Keep server credentials for the legacy bucket while old objects are still served through the API. Import unregistered legacy uploads before linking to them.
   - [x] Validate media status IDs as UUIDs, scope lookup by tenant, and remove the filesystem fallback.
3. **Fix Cross-Tenant Worker Corruption & Confirm IDOR (`BE-03`, `BE-04`)**:
   - [x] Limit transcode updates to lessons in the verified asset tenant. Match by explicit module ID or exact recorded source URL.
   - [x] Verify asset ownership before confirming an upload and forward the verified tenant to the worker.
4. **Lock Down Learning Endpoints, `x-tenant-id` Bypass, & Quiz Grading (`BE-05`, `UI-03`)**:
   - [x] Require permission, verified tenant membership, and active enrollment across all eight learning routes.
   - [x] Remove answer keys and rationales from student quiz payloads. Grade selected answers using the authenticated student identity and complete lessons only after a passing score.
   - [ ] Enforce quiz attempt limits and timers on the server.
5. **Fix Tenant Settings Overwrite, Dashboard RBAC, & Fatal UI Crashes (`UI-01`, `UI-04`, `UI-05`, `UI-06`, `UI-07`, `UI-08`)**:
   - [x] Target the newly created tenant explicitly when saving its settings and reject mismatched targets (`UI-04`).
   - [x] Share tenant hostname detection between auth and proxy, preserve dashboard routing, and render the access-restricted screen with the lock icon (`UI-05`).
   - [x] Restrict login redirects to same-origin paths and connect login auto-enrollment to the authenticated self-enrollment API (`UI-06`).
   - [x] Gate dashboard routes, management actions, and data loading by the active workspace role. Keep enrollment credentials out of the dashboard (`UI-01`).
   - [x] Mount quiz and assignment builder forms only when open (`UI-07`).
   - [x] Render the assignment receipt and its PDF link without crashing (`UI-08`).

### P1 — High Security, Auth, Persistence, & Core Cross-Layer Contracts

1. **Fix Broken Repository Persistence (`BE-06`)**:
   - [x] Persist media assets and quiz submissions through `DatabaseClient.query()`.
   - [ ] Fix persistence for batch and organization repositories.
2. **Harden Authentication, Recovery, & Brute-Force Defenses (`BE-07`, `BE-08`, `BE-10`)**:
   - Remove `'hashed_'` prefix password comparison in `services.js`; require `JWT_SECRET` outside `test`; enforce `user.status === 'ACTIVE'` and `tenant.status === 'ACTIVE'` on login, refresh, and role lookups.
   - [x] Build password reset links from validated `APP_URL`, omit secrets and account existence from responses, and keep new tokens out of HTTP URLs and request logs (`BE-08`).
   - Register `@fastify/rate-limit` and `@fastify/helmet`, and reduce the global `100MB` `bodyLimit`.
3. **Fix Public Catalog Filtering, Edge Proxy, Cookie/CSRF & Refresh Races (`BE-09`, `UI-10`, `UI-11`, `UI-12`, `UI-13`)**:
   - Restrict public catalog listings and self-enrollment to `PUBLIC` + `PUBLISHED`/`ACTIVE` courses, enforce `tenant.status === 'ACTIVE'` on `/tenants/:slug`, and replace in-memory `findByTenantId(null)` with paginated SQL queries.
   - Proxy `/api/*` via Next.js or configure shared parent cookie `Domain` + `SameSite=Lax`; route all mutations through a unified CSRF/credentials helper; add a singleton `refreshInFlightPromise` in `ApiClient`.
   - Fix `proxy.js` dot-bypass, `Host` validation, and query-string preservation; sync `AuthContext` in `activate/page.js` and handle `res.success === false` in `register/page.js`.
4. **Sanitize External URLs, Iframes, & PDF Validation (`UI-09`)**:
   - Enforce `http:`/`https:` URL validation on `<iframe>`/`<a>`/`<img>`, add `sandbox` attributes to iframes, fix `&&` -> `||` PDF validation, and stop persisting `blob:` URLs.

### P2 — Data Integrity, Schema Parity, Assessment Persistence, & UI Stability

1. **Implement Real DB Transactions & Atomic Concurrency (`BE-11`)**:
   - Replace mock `executeTransaction` with real `BEGIN`/`COMMIT`/`ROLLBACK` transactions across registration and tenant provisioning; claim outbox rows atomically; use atomic `UPDATE ... WHERE revoked_at IS NULL` in `RefreshTokenUseCase`; add `UNIQUE(student_user_id, lesson_module_id)` on `student_progress`.
2. **Resolve Schema Drift, `LessonModule` Quiz Wipe, & Publish Lifecycle (`BE-13`, `BE-14`, `BE-18`, `BE-19`)**:
   - [x] Preserve quiz configuration when reloading and editing lesson modules.
   - [ ] Preserve remaining lesson module properties, migrate Neon provisioning to versioned Drizzle SQL migrations, update enrollment progress on completion, and persist Type B submissions and grades.
   - Add `PATCH /courses/:id` + `POST /courses/:id/publish`, validate `batchId` course/tenant ownership in `PATCH /enrollments/:id`, normalize slugs consistently, and enforce UUID JSON schemas (`BE-14`).
3. **Fix Media Upload Constraints, Worker Resilience, TLS, & Session Hygiene (`BE-12`, `BE-15`, `BE-16`, `BE-17`)**:
   - Enforce `MimeType` allowlist + R2 `PutObjectCommand` `ContentType`/size constraints, clean up temp upload files, and eliminate hardcoded `localhost:3001` URLs (`BE-12`, `UI-18`).
   - Revoke sessions in `ChangePasswordUseCase`, align `minLength: 8` on `/auth/activate`, HTML-escape email templates, enforce `rejectUnauthorized: true` + `settingsJson` schema validation, and add a worker stalled-job reaper.
   - [x] Fail missing-source transcodes instead of marking synthetic output as ready.
4. **Fix Cross-Layer Schemas & UI Component Bugs (`UI-14`–`UI-23`)**:
   - Align `settingsJson.branding.*` (`UI-16`), standardize price display in cents (`UI-17`), split `API_ORIGIN` vs `/api/v1` (`UI-18`), fix `getBatches()` contract (`UI-19`), fix quiz key/timer bugs (`UI-14`), rubric path & mock seeding (`UI-15`), Course Settings save & optimistic errors (`UI-20`), `MediaUploader`/`HlsVideoPlayer` bugs (`UI-21`), LMS player sync/`?enrolled=` spoof (`UI-22`), and `CommandPalette` cache (`UI-23`).

### P3 — Cleanup, UX Polish, & Technical Hygiene

- Scope `apple-cards-carousel.tsx` Escape/overflow effects to `open === true` and use `gsap.context()` in `parallax-scrolling.tsx` (`UI-24`).
- Replace landing template demo pricing (`Pricing5Demo`) and synthetic dashboard widgets (`UI-25`).
- Fix or remove `/docs` link, unify client/server password complexity rules, fix direct `/org/[slug]` links (`UI-26`), remove hardcoded developer emails (`UI-27`), and delete dead legacy mock files (`AuthProvider.jsx`, `services/api.js`, `multi-step-loader-demo.tsx`, Express `routes/index.js`, `middleware/index.js`).
- Remove `ALLOW_DEV_AUTH_BYPASS = 'true'` reliance in API integration test suites so automated tests exercise real RBAC, tenant scoping, and PostgreSQL persistence.

---

## 7. Complete Repository Audit Coverage Matrix

### 7.1 Backend, Worker, Domains & Infrastructure Coverage (`apps/api`, `apps/worker`, `packages/*`)

| Area | Audited Files & Modules | Audit Status | Mapped Findings |
|---|---|---|---|
| **API Entry, Bootstrap & Middleware** | `apps/api/package.json`, `src/index.js`, `src/bootstrap/{container,domain-bridge,providers,services}.js`, `src/middleware/{auth,authCookies,authorize,csrf,tenantScope,index}.js`, `src/routes/index.js` | Audited + Fastify v4 Runtime Tested | `BE-02`, `BE-05`, `BE-06`, `BE-07`, `BE-10`, `BE-17` |
| **API Public Routes** | `apps/api/src/routes/v1/public/index.js` (lines `1-1154`) | Audited | `BE-01`, `BE-08`, `BE-09`, `BE-10`, `BE-11`, `BE-14`, `BE-15`, `BE-16`, `BE-19` |
| **API Internal Routes** | `apps/api/src/routes/v1/internal/{index,users,academics,learning,media}.js` | Audited | `BE-01`, `BE-02`, `BE-03`, `BE-04`, `BE-05`, `BE-09`, `BE-12`, `BE-13`, `BE-14`, `BE-15`, `BE-16`, `BE-19` |
| **API Tests & Neon Scripts** | `apps/api/{create-neon-tables,seed-neon,clear-neon,test-auth,test-route-security}.js`, `apps/api/test/{api,forgot-password,storefront}.test.js` | Audited | `BE-06`, `BE-13`, `BE-16` |
| **Worker Service** | `apps/worker/src/{index,bootstrap/index,jobs/index,outbox/index,outbox/publisher,processors/index,scheduler/index,services/transcoder,workers/index}.js`, `apps/worker/test/transcoder.test.js` | Audited | `BE-03`, `BE-11`, `BE-15`, `BE-17` |
| **Domains: Identity** | `packages/domains/identity/{domain/entities/*,domain/value-objects/*,application/use-cases/*,test/identity.test.js}` | Audited | `BE-07`, `BE-11`, `BE-15`, `BE-16` |
| **Domains: Academics** | `packages/domains/academics/{domain/entities/*,domain/value-objects/*,application/use-cases/*,test/academics.test.js}` | Audited | `BE-19` |
| **Domains: Learning** | `packages/domains/learning/{domain/entities/*,domain/value-objects/*,application/use-cases/*,test/learning.test.js}` | Audited | `BE-01`, `BE-05`, `BE-11`, `BE-13` |
| **Domains: Media** | `packages/domains/media/{domain/entities/*,domain/value-objects/*,application/use-cases/*,test/media.test.js}` | Audited | `BE-04`, `BE-12` |
| **Infra: Database** | `packages/infrastructure/database/src/{client/index,drizzle-bridge,DatabaseProvider,transactions/index,migrations/index,schema/*.js,repositories/*.js,seed/*,scripts/sync-neon.js}`, `test/{database,seed}.test.js` | Audited | `BE-06`, `BE-07`, `BE-11`, `BE-13`, `BE-15`, `BE-16` |
| **Infra: Storage, Mail, Queue & Shared** | `packages/infrastructure/{storage,mail,queue,cache,auth,ffmpeg,logger,monitoring}/src/**`, `packages/{core,contracts,config,utils}/src/**` | Audited | `BE-12`, `BE-16`, `BE-17` |
| **Cross-Layer Contracts (Backend View)** | `apps/web/{lib/api.js,next.config.mjs,proxy.js,providers/auth-context.js,services/assessment-service.js}`, `.env.example` | Audited | `BE-05`, `BE-18` |

### 7.2 UI & Cross-Layer Coverage (`apps/web`, `packages/ui`)

| Target Path / Module | Role / Scope | Audit Status | Mapped Findings |
|---|---|---|---|
| `apps/web/proxy.js` | Edge subdomain routing & `/dashboard` cookie check | Audited | `UI-12` |
| `apps/web/next.config.mjs` | Next.js rewrites & image remote patterns | Audited | `UI-18`, `BE-18` |
| `apps/web/package.json`, `tsconfig.json`, `eslint.config.mjs` | Build/lint/TS configuration | Clean | — (`.turbo/turbo-lint.log` excluded as stale) |
| `apps/web/providers/auth-context.js` | Session, tenant switching, subdomain detection | Audited | `UI-02`, `UI-05`, `UI-13` |
| `apps/web/providers/AuthProvider.jsx`, `apps/web/services/api.js` | Legacy unused mock provider/service | Audited | `UI-27` |
| `apps/web/lib/api.js` | HTTP client, CSRF, refresh, all API bindings | Audited | `UI-02`, `UI-03`, `UI-04`, `UI-10`, `UI-11`, `UI-18`, `BE-18` |
| `apps/web/lib/{course-media,catalog-data,utils}.js` | Media URL helpers, fallback catalog, `cn()` | Audited | `UI-18` (`course-media.js`), others clean |
| `apps/web/services/assessment-service.js` | Client quiz evaluation & submission seeding | Audited | `UI-03`, `UI-14`, `UI-15`, `BE-18` |
| `apps/web/app/layout.js`, `globals.css` | Root layout & Tailwind CSS tokens | Clean | — |
| `apps/web/app/page.js` | Public marketing landing page | Audited | `UI-25` |
| `apps/web/app/login/page.js` | Login page & `autoEnroll` redirect | Audited | `UI-02`, `UI-06` |
| `apps/web/app/register/page.js` | 3-step institution onboarding wizard | Audited | `UI-09`, `UI-13`, `UI-16`, `UI-26` |
| `apps/web/app/activate/page.js` | Student account activation flow | Audited | `UI-13`, `UI-26` |
| `apps/web/app/{forgot-password,reset-password}/page.js` | Password recovery pages | Audited | `UI-10`, `UI-26`, `UI-27` |
| `apps/web/app/{catalog,courses,courses/[id]}/page.js` | Global catalog & public course checkout | Audited | `UI-02`, `UI-17` |
| `apps/web/app/t/[slug]/{page.js,courses/page.js}` | Path-based tenant portal & checkout | Audited | `UI-02`, `UI-17` |
| `apps/web/app/org/[slug]/{layout.js,page.js,StorefrontClient.jsx,courses/[courseId]/*}` | Subdomain/org public storefront | Audited | `UI-16`, `UI-17`, `UI-26` |
| `apps/web/app/dashboard/layout.js` | Authenticated shell, nav, lockout UI | Audited | `UI-01`, `UI-02`, `UI-05` |
| `apps/web/app/dashboard/page.js` | Dashboard overview (admin + student) | Audited | `UI-01`, `UI-02`, `UI-11`, `UI-19` |
| `apps/web/app/dashboard/courses/page.js` | Course catalog & management list | Audited | `UI-02`, `UI-22` |
| `apps/web/app/dashboard/courses/[id]/page.js` | Curriculum builder, grading, course settings | Audited | `UI-01`, `UI-07`, `UI-15`, `UI-20` |
| `apps/web/app/dashboard/courses/[id]/learn/page.js` | Student LMS player (alternate) | Audited | `UI-09`, `UI-22` |
| `apps/web/app/dashboard/courses/[id]/lesson/[lessonId]/page.js` | Classroom lesson & video/quiz player | Audited | `UI-03`, `UI-09`, `UI-18`, `UI-22` |
| `apps/web/app/dashboard/students/page.js` | Student directory, enrollment, activation | Audited | `UI-01`, `UI-11`, `UI-19`, `UI-20` |
| `apps/web/app/dashboard/tenants/page.js` | Multi-tenant management & provisioning | Audited | `UI-01`, `UI-04`, `UI-16` |
| `apps/web/app/dashboard/settings/page.js` | Workspace branding, account, & docs settings | Audited | `UI-01`, `UI-09`, `UI-11`, `UI-16`, `UI-26` |
| `apps/web/components/assessments/*` (5 components) | Quiz/assignment builders, players, grading workbench | Audited | `UI-03`, `UI-07`, `UI-08`, `UI-09`, `UI-14`, `UI-15` |
| `apps/web/components/dashboard/*` (9 components) | Command palette, analytics, wizard, sidebar, tasks, charts, cards, banner, breadcrumb | Audited | `UI-01`, `UI-23`, `UI-25` (remaining clean) |
| `apps/web/components/media/HlsVideoPlayer.jsx`, `components/ui/media-uploader.jsx` | HLS video player & chunked uploader | Audited | `UI-18`, `UI-21` |
| `apps/web/components/{theme-route-sync.js,site-footer.tsx,comparison-section.tsx,core-architecture-marquee.tsx,interactive-spotlight-bento.tsx,rapid-onboarding-timeline.tsx,auth-multi-step-loader.tsx,apple-cards-carousel-demo.tsx,multi-step-loader-demo.tsx}` | Marketing sections, loaders, theme sync | Audited | `UI-27` (`multi-step-loader-demo.tsx`), others clean |
| `apps/web/components/ui/*`, `components/base-ui/*`, `hooks/use-outside-click.tsx` | UI primitives, animations, pricing, hooks | Audited | `UI-09` (`tenant-logo.jsx`), `UI-24` (`apple-cards-carousel.tsx`, `parallax-scrolling.tsx`), `UI-25` (`pricing-5/demo.tsx`), others clean |
| `packages/ui/src/index.js` | Shared UI package export | Clean | — |

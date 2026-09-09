# 07 – Authentication & Authorization

## Purpose

This document defines the authentication and authorization architecture for the Education Operating System (EOS).

It provides a secure, multi-tenant, enterprise-grade identity foundation supporting Web and Mobile applications, tenant isolation, fine-grained Role-Based Access Control (RBAC), session revocation, and future Enterprise SSO/OAuth integrations.

---

## Implementation Status

| Area | Status |
| :--- | :--- |
| Short-lived JWT access token (15 min) | ✅ Implemented |
| Opaque, rotating refresh token + `user_sessions` (§1–3) | ✅ Implemented — `POST /auth/refresh` rotates on use and rejects reuse of a rotated-out token |
| Single-device logout / session revocation (§3) | ✅ Implemented — `POST /auth/logout` |
| Global logout (all devices) | ⚠️ Repository method exists (`revokeAllForUser`) but no route calls it yet |
| Web cookie transport (§ Security Configuration Summary) | ✅ Implemented — `access_token`/`refresh_token` set as `httpOnly` cookies (`SameSite=Lax`/`Strict` respectively) via `apps/api/src/middleware/authCookies.js`; `Secure` is gated on `NODE_ENV=production` so plain-http local dev still works. Bearer-header auth still works unmodified for mobile/API clients — cookie wins if both are present |
| CSRF protection (Double-Submit Cookie Header) | ✅ Implemented — `apps/api/src/middleware/csrf.js` requires a non-httpOnly `csrf_token` cookie to match an `x-csrf-token` header on any mutating request that carries an auth cookie. Bearer-only clients are exempt (verified) since a cross-site page can't attach that header without ever seeing the cookie |
| `@eos/infra-auth` provider abstraction (Core Design Principles) | ❌ Not actually used — the real login/token/hash logic lives inline in `apps/api/src/bootstrap/services.js` (plain `bcryptjs` + `jsonwebtoken`). The `@eos/infra-auth` package was a fully mock, unused `JwtAuthProvider` and has since been deleted |
| Password hashing | ⚠️ **bcryptjs (10 rounds)**, not Argon2id as described in §4. Switching algorithms now would invalidate every existing user's stored hash with no migration path — flagged as a deliberate deferral, not an oversight |
| Password strength enforcement (§4) | ❌ Not implemented — only a minimum length check |
| Scoped multi-tenant RBAC (§5) | ✅ Implemented — `roles`, `permissions`, `role_assignments` tables match this doc's schema; seeded roles: `ADMIN`, `INSTRUCTOR`, `STUDENT`. `authorize(permission)` middleware resolves permissions dynamically per request, never from the JWT, matching the caution in §2. Wired onto `course.create` as the reference example — not yet applied to every route |
| Time-bound `permission_grants` (§6) | ❌ Not implemented |
| Enterprise SSO/OAuth | ❌ Not implemented (future work per `docs/future_evolution.md`) |

---

# Core Design Principles

- **Secure by Default:** Zero-trust pipeline; explicit authorization required for all non-public routes.
- **Stateless Verification:** Short-lived JWT access tokens for high-speed API verification.
- **Revocable Session Management:** Opaque, hashed refresh tokens stored in database sessions.
- **Scoped Authorization:** Permissions evaluated dynamically within tenant and organization boundaries.
- **Least Privilege:** Fine-grained `resource.action` permission enforcement.
- **Auditability:** Complete logging of authentication attempts, session revocations, and role mutations.
- **Provider Agnostic:** Decoupled behind `@eos/infra-auth` contracts.

---

# Token Strategy Matrix

```text
               ┌─────────────────────────────────────────────────┐
               │                Login Endpoint                   │
               └────────────────────────┬────────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
             ▼                                                     ▼
┌──────────────────────────┐                             ┌───────────────────┐
│   Access Token (JWT)     │                             │   Refresh Token   │
│  - Short-lived (15 min)  │                             │   (Opaque String) │
│  - Stateless Validation  │                             └─────────┬─────────┘
│  - Transmitted via Header│                                       │
└──────────────────────────┘                                       ▼
                                                         ┌───────────────────┐
                                                         │   SHA-256 Hash    │
                                                         └─────────┬─────────┘
                                                                   │
                                                                   ▼
                                                         ┌───────────────────┐
                                                         │    UserSession    │
                                                         │  - Lifetime (30d) │
                                                         │  - DB Persisted   │
                                                         └───────────────────┘
```

### Why Opaque Refresh Tokens?
Access Tokens are stateless JWTs because Fastify route handlers must verify signatures rapidly without database queries.
**Refresh Tokens are deliberately NOT JWTs.** They are cryptographically secure random bytes whose SHA-256 hash is persisted in the `user_sessions` table.

> [!IMPORTANT]
> ### Security Advantage of Hashed Opaque Refresh Tokens
> If the application database is ever compromised, attackers obtain only SHA-256 hashes of refresh tokens. Because raw refresh tokens exist only on client devices, attackers **cannot replay stolen database hashes to forge valid user sessions**.

---

# 1. Session Model (`UserSession`)

Every authentication creates an audited, revocable session.

### Table Schema: `user_sessions`

```sql
CREATE TABLE user_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 Hash of raw refresh token
  device_name         VARCHAR(100),                -- e.g., "Chrome on macOS", "iPhone 15 Pro"
  ip_address          VARCHAR(45),
  user_agent          TEXT,
  last_activity_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,        -- 30 Days from creation
  revoked_at          TIMESTAMPTZ,                 -- Non-null = Revoked session
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 2. JWT Access Token Claims

Access tokens are short-lived (15 minutes).

```json
{
  "sub": "01917f8a-9c42-7a1b-8c4d-123456789abc",
  "tenantId": "01917f8b-1122-7334-9aa1-fedcba987654",
  "sessionId": "01917f8c-3344-7556-8bb2-abcdef123456",
  "email": "user@skillyards.com",
  "iat": 1710000000,
  "exp": 1710000900
}
```

> [!NOTE]
> The implemented payload currently carries `userId`/`email`/`name` (+ `iat`/`exp`) — no `tenantId` or `sessionId` claim yet. Since tenant is already sent per-request via `x-tenant-id` and resolved server-side against `role_assignments` (never trusted from the token), omitting it here is consistent with the no-stale-claims caution below; adding a `sessionId` claim would let `authorize()` skip a lookup but isn't implemented yet.

> [!CAUTION]
> **Do not embed roles or permissions in the JWT.**
> Roles and permissions change over time. Embedding them in JWTs causes stale authorization bugs until token expiration. EOS resolves permissions dynamically in request context.

---

# 3. Authentication Workflows

### Login Workflow
1. Client submits email and password.
2. Server verifies password hash using **Argon2id**.
3. Server creates a `user_sessions` record.
4. Server generates:
   - Stateless 15-minute JWT Access Token.
   - Cryptographically random 30-day Refresh Token string.
5. Server saves the SHA-256 hash of the Refresh Token to `user_sessions`.
6. Server returns both tokens to client (or sets HTTP-Only secure cookies).

### Token Refresh & Rotation
1. Client submits raw Refresh Token string to `/auth/refresh`.
2. Server computes SHA-256 hash of the incoming refresh token.
3. Server looks up active `user_sessions` where `refresh_token_hash = hash AND revoked_at IS NULL AND expires_at > NOW()`.
4. **Token Rotation:** Server invalidates old session, generates a new Refresh Token, hashes it, and issues a fresh JWT.

### Session Revocation (Logout)
- **Single Device Logout:** Sets `revoked_at = NOW()` on the active session.
- **Global Logout (All Devices):** Sets `revoked_at = NOW()` for all sessions where `user_id = $1`. Active access tokens expire naturally within 15 minutes.

---

# 4. Password Policy & Hashing

All passwords are hashed using **Argon2id** (winner of the Password Hashing Competition).

```text
Algorithm: Argon2id
Memory Cost (m): 65,536 KiB (64 MB)
Time Cost (t): 3 iterations
Parallelism (p): 4 threads
```

### Password Strength Enforcement
- Minimum 12 characters.
- Requires uppercase, lowercase, number, and special character.
- Checked against common leaked password lists (pwned passwords).

---

# 5. Scoped Role-Based Access Control (RBAC)

Authorization resolves permissions through a 4-tier model:

```text
User ──> RoleAssignment ──> Role ──> RolePermission ──> Permission
```

### Table Schema: `role_assignments`

```sql
CREATE TABLE role_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = Tenant-wide Role
  role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_user_tenant_org_role UNIQUE (user_id, tenant_id, organization_id, role_id)
);
```

### Multitenant Scoping Example
A single global user (`John`) can hold distinct roles across organizations:
- **Tenant:** SkillYards $\rightarrow$ **Organization:** Delhi Branch $\rightarrow$ **Role:** Instructor
- **Tenant:** SkillYards $\rightarrow$ **Organization:** Mumbai Branch $\rightarrow$ **Role:** Org Admin

---

# 6. Temporary Permission Grants (`PermissionGrant`)

Allows temporary elevation of specific permissions without bloating role definitions.

### Table Schema: `permission_grants`

```sql
CREATE TABLE permission_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  granted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 7. Standardized Permission Naming Convention

All permissions adopt the strict `resource.action` pattern:

```text
course.read          course.create        course.update        course.delete
lesson.read          lesson.publish       assessment.submit    certificate.issue
tenant.manage        organization.invite  user.suspend         media.upload
```

---

# 8. Middleware Pipelines

### Authentication Middleware (`authenticate`)
```text
Request ──> Extract Bearer Token / Cookie ──> Verify JWT Signature ──> Load Active Session ──> Attach req.user & req.session
```

### Authorization Middleware (`authorize('course.create')`)
```text
req.user ──> Load Tenant & Org Scopes ──> Resolve Active Role Assignments ──> Fetch Permissions ──> Evaluate Match ──> Proceed / 403 Forbidden
```

---

# Security Configuration Summary

| Platform | Access Token | Refresh Token Storage | CSRF Protection |
| :--- | :--- | :--- | :--- |
| **Web Browser** | HTTP-Only, Secure, SameSite=Lax Cookie | HTTP-Only, Secure, SameSite=Strict Cookie | Double-Submit Cookie Header |
| **Mobile App** | In-Memory (State) | iOS Keychain / Android Keystore | OAuth Bearer Header |

> [!NOTE]
> The Web Browser row is implemented as written (see Implementation Status above). One deviation: `Secure` is only set when `NODE_ENV=production`, since browsers reject `Secure` cookies over plain HTTP and local dev runs the API over http. The refresh token cookie is additionally scoped to `Path=/api/v1/public/auth` (not sent on every request) to limit exposure. The Mobile App row is unimplemented — there's no mobile client yet — but the API already supports it: `Authorization: Bearer` auth and refresh-token-in-body both work as a fallback whenever the request carries no auth cookie.

---

# Architectural Decision Records (ADRs)

---

## ADR-025: Stateless Access Tokens with Opaque Hashed Refresh Tokens

### Status
**Accepted**

### Context
Using JWTs for both access and refresh tokens prevents instant session revocation and exposes tokens if the DB is leaked.

### Decision
Use short-lived (15 min) JWT Access Tokens paired with rotating, opaque 30-day Refresh Tokens stored as SHA-256 hashes in `user_sessions`.

### Benefits
- Instant session revocation capability.
- Immune to replay attacks if DB is compromised.
- High performance for stateless route verification.

---

## ADR-026: Scoped Multi-Tenant RBAC

### Status
**Accepted**

### Context
Users require different permissions depending on the institution branch or organization context.

### Decision
Scope role assignments to `tenant_id` and optional `organization_id` in `role_assignments`.

### Benefits
- Flexible, enterprise-grade permission boundaries.
- Single global user account across multiple branches/tenants.

---

## ADR-027: Time-Bound Permission Grants

### Status
**Accepted**

### Context
Elevating permissions temporarily (e.g. guest instructor grading for 2 weeks) often causes "role explosion".

### Decision
Introduce time-bound `permission_grants` that expire automatically.

### Benefits
- Prevents role sprawl.
- High auditability for temporary privileges.

---

# Guiding Principle

> **Authentication identifies the user. Authorization evaluates what the user may do within a specific tenant and organization. Roles provide the baseline, while scoped role assignments and temporary permission grants provide the flexibility required for enterprise-scale Education Operating Systems.**

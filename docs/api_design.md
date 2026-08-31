# 08 – API Design

## Purpose

This document defines the REST API architecture for the Education Operating System (EOS).

It establishes predictable resource standards, business action workflows, standard response envelopes, cursor pagination rules, error formats, and security headers for Web, Mobile, ERP, and third-party developer integrations.

---

# Design Principles

- **REST-First & Contract-First:** Resource-oriented design documented via OpenAPI 3.1 specifications.
- **Explicit Business Action Workflows:** Non-CRUD state transitions mapped to clear action endpoints (e.g. `POST /courses/{id}/publish`).
- **Internal vs. Public API Separation:** Clean boundary between platform-internal routes and public/third-party API integrations.
- **Stateless & Scalable:** High-performance Fastify handlers operating without server state.
- **Predictable Envelopes:** Uniform JSON envelopes across all successful and error responses.
- **Cursor Pagination:** Time-ordered B-tree cursor pagination for high-volume datasets.
- **Idempotent Operations:** Critical POST operations support `Idempotency-Key` headers.

---

# Base URL & API Separation

```text
/api/v1/internal/      <-- Web App, Mobile App, Background Workers, Internal Plugins
/api/v1/public/        <-- Third-Party Integrations, ERP Adapters, External Developers
```

### Versioning Rules
- Major version changes appear in the URI path (`/api/v1/`, `/api/v2/`).
- Minor non-breaking updates remain in the current major version.
- Minor dot notation in URLs (e.g., `v1.1`) is strictly prohibited.

---

# HTTP Methods & Resource Naming

Plural nouns represent resources. Verbs are avoided in collection paths.

| Method | Usage |
| :--- | :--- |
| **`GET`** | Retrieve a single resource or paginated collection. |
| **`POST`** | Create a new resource OR execute an explicit business action. |
| **`PATCH`** | Partial update of resource fields. |
| **`DELETE`** | Soft delete a resource. |

---

# Business Action Endpoints

Standard CRUD operations are insufficient for business domain state transitions. Instead of sending arbitrary `PATCH` updates, EOS uses explicit action endpoints:

```text
POST /api/v1/internal/courses/{id}/publish       <-- Triggers PublishCourseUseCase
POST /api/v1/internal/courses/{id}/archive       <-- Triggers ArchiveCourseUseCase
POST /api/v1/internal/courses/{id}/duplicate     <-- Triggers DuplicateCourseUseCase
POST /api/v1/internal/enrollments/{id}/cancel    <-- Triggers CancelEnrollmentUseCase
```

---

# Standard Response Envelopes

Every API endpoint returns a predictable top-level JSON structure.

### Success Response Envelope

```json
{
  "success": true,
  "data": {
    "id": "01917f8a-9c42-7a1b-8c4d-123456789abc",
    "title": "React Masterclass",
    "status": "PUBLISHED"
  },
  "meta": {
    "nextCursor": "01917f8b-1122-7334-9aa1-fedcba987654",
    "hasNext": true
  },
  "requestId": "req_01HF98Z123456789ABCDEFGH"
}
```

### Error Response Envelope (RFC 7807 Inspired)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed for course creation",
    "details": [
      {
        "field": "title",
        "message": "Title is required and must be at least 5 characters"
      }
    ]
  },
  "requestId": "req_01HF98Z123456789ABCDEFGH"
}
```

---

# HTTP Status Codes

| Code | Status | Meaning |
| :--- | :--- | :--- |
| **`200`** | OK | Query succeeded or update applied. |
| **`201`** | Created | Resource successfully created. |
| **`204`** | No Content | Deletion or action completed with no response body. |
| **`400`** | Bad Request | Syntactically invalid JSON or validation error. |
| **`401`** | Unauthorized | Invalid, expired, or missing JWT access token. |
| **`403`** | Forbidden | User lacks permission (`resource.action`) for tenant/org scope. |
| **`404`** | Not Found | Target resource does not exist. |
| **`409`** | Conflict | Unique constraint violation (e.g. duplicate slug or email). |
| **`422`** | Unprocessable | Business rule violation (e.g. publishing course without lessons). |
| **`429`** | Too Many Requests| Rate limit threshold exceeded. |
| **`500`** | Internal Error | Unexpected server exception (details hidden in production). |

---

# Cursor Pagination Strategy

EOS standardizes on **Cursor Pagination** using time-ordered UUID v7 keys for high performance under concurrent writes.

```text
GET /api/v1/internal/courses?limit=20&cursor=01917f8a-9c42-7a1b-8c4d-123456789abc
```

```sql
SELECT * FROM courses 
WHERE organization_id = $1 
  AND id < $2 
ORDER BY id DESC 
LIMIT 21;
```

---

# Request Headers

```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
X-Tenant-Id: 01917f8a-9c42-7a1b-8c4d-123456789abc
X-Request-Id: req_01HF98Z123456789ABCDEFGH
Idempotency-Key: idemp_01917f8b-1122-7334-9aa1-fedcba987654
```

### Idempotency Guarantee
For critical non-idempotent operations (payment processing, enrollments, certificate issuing), clients submit an `Idempotency-Key` header.
- The API checks Redis/Database for existing `(tenant_id, idempotency_key)` records.
- If present, the cached original response envelope is returned instantly without re-executing the use case.

---

# Request Execution Lifecycle

```text
Incoming HTTP Request
         │
         ▼
1. Attach Request ID (X-Request-Id)
         │
         ▼
2. Rate Limiting Middleware (@fastify/rate-limit)
         │
         ▼
3. Authentication Middleware (Verify JWT & Attach Context)
         │
         ▼
4. Authorization Middleware (Evaluate Tenant & Scoped Permission)
         │
         ▼
5. Request Validation (TypeBox / Zod Schema Validation)
         │
         ▼
6. Fastify Controller Invocation
         │
         ▼
7. Application Use Case Execution (DB Transaction Boundary)
         │
         ▼
8. Response Serializer (Strip Sensitive Fields)
         │
         ▼
Outgoing HTTP Response Envelope
```

---

# Rate Limiting Standards

- **Anonymous Endpoints:** `60 requests / minute`
- **Authenticated Internal API:** `300 requests / minute`
- **Authentication Routes (`/auth/login`):** `10 requests / 15 minutes`
- **Public API (`/api/v1/public/`):** Configurable per customer tier.

---

# Architectural Decision Records (ADRs)

---

## ADR-028: REST-First & Business Action API Design

### Status
**Accepted**

### Context
Pure CRUD APIs obscure business workflows and force clients to handle complex domain logic.

### Decision
Adopt REST resources for reading and updating state, paired with explicit `POST /resource/{id}/action` endpoints for business workflows.

### Benefits
- Clear mapping to Clean Architecture Use Cases.
- Easy API documentation.
- Robust auditability.

---

## ADR-029: Standard Top-Level Response Envelope

### Status
**Accepted**

### Context
Heterogeneous API response shapes complicate frontend error handling and client SDK development.

### Decision
Standardize all API responses around top-level `success`, `data`/`error`, `meta`, and `requestId` fields.

### Benefits
- Uniform frontend error interceptors.
- Consistent tracing across microservices and background workers.

---

## ADR-030: Standard Cursor Pagination

### Status
**Accepted**

### Context
`OFFSET` pagination degrades significantly on PostgreSQL tables with millions of rows (`OFFSET 100000` scans 100,000 index entries).

### Decision
Enforce cursor pagination based on UUID v7 sequential keys across all collection endpoints.

### Benefits
- Constant-time $O(1)$ query speed regardless of page depth.
- Prevents missing or duplicate items when concurrent writes occur during navigation.

---

# Guiding Principle

> **The API represents business capabilities, not database tables. Resources expose state, while explicit action endpoints model business workflows. A stable, versioned, and well-documented contract allows the platform to evolve internally without breaking clients.**

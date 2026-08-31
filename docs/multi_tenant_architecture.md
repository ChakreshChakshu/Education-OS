# 04 - Multi-Tenant Architecture

## Purpose

This document defines how the Education Operating System (EOS) supports multiple customers (tenants) while maintaining complete data isolation, high performance, and future extensibility.

The multi-tenant architecture is designed to support:
- SkillYards
- Coaching Institutes
- Colleges
- Universities
- Corporate Learning Platforms

without requiring changes to core application logic.

---

# Core Goals

The multi-tenant architecture provides:
- **Strong Tenant Isolation:** Zero cross-tenant data leakage.
- **Organization-Level Management:** Multi-branch operational boundaries within tenants.
- **Secure Authorization:** Role-based access derived from membership.
- **Shared Infrastructure:** High resource utilization and low operational costs.
- **Low-Friction Onboarding:** Instant provisioning for new customers.
- **Horizontal Scalability:** Stateless application instances operating over read-replicas.
- **Future Enterprise Support:** Path to dedicated databases for enterprise customers.

---

# Multi-Tenant Architecture Model

EOS follows a **Shared Database, Shared Schema** architecture model.

```text
                                PostgreSQL Database
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
    SkillYards                     ABC College                       XYZ Company
    (Tenant A)                     (Tenant B)                        (Tenant C)
```

All tenants share the same PostgreSQL database and database schema. Tenant data isolation is strictly enforced at the **application and repository layer**.

---

# Tenant & Ownership Hierarchy

```text
Platform (EOS)
    │
    ├── Tenant A (e.g. SkillYards)
    │      │
    │      ├── Organization 1 (e.g. Delhi Campus)
    │      │        │
    │      │        ├── Courses
    │      │        ├── Instructors
    │      │        ├── Students
    │      │        └── Learning Progress Data
    │      │
    │      └── Organization 2 (e.g. Mumbai Campus)
    │
    └── Tenant B (e.g. ABC College)
```

### Ownership Flow

Ownership flows downward through the entity hierarchy:

```text
Platform  ──>  Tenant  ──>  Organization  ──>  Course  ──>  Lesson  ──>  Assessment
```

Every record in the system ultimately belongs to exactly **one tenant** via either **direct** or **indirect** ownership.

---

# Tenant Isolation Strategy

EOS does **NOT** needlessly duplicate `tenant_id` on every table in the database. Instead, tenant ownership is normalized through parent-child relationships.

```text
               ┌────────────────┐
               │     Tenant     │
               └───────┬────────┘
                       │ tenant_id
               ┌───────▼────────┐
               │  Organization  │
               └───────┬────────┘
                       │ organization_id
               ┌───────▼────────┐
               │     Course     │
               └───────┬────────┘
                       │ course_id
               ┌───────▼────────┐
               │     Lesson     │
               └────────────────┘
```

### 1. Direct Tenant Ownership
Entities that are directly attached to a tenant contain an explicit `tenant_id` column:
- `Tenant`
- `Organization`
- `TenantSettings`
- `Subscription`
- `BillingInvoice`
- `FeatureFlag`

### 2. Indirect Tenant Ownership
Entities that belong to an organization inherit tenant ownership transitively:
- `Course` (belongs to `Organization`)
- `Lesson` (belongs to `Course`)
- `Curriculum` (belongs to `Course`)
- `Assessment` (belongs to `Course` or `Lesson`)
- `Certificate` (belongs to `Enrollment` / `Course`)
- `Enrollment` (belongs to `User` and `Course` within `Organization`)

### 3. Controlled Denormalization
High-volume query tables may include a denormalized `tenant_id` column as an explicit performance optimization.

#### Example: `LessonProgress`
```text
LessonProgress
├── id
├── tenant_id          <-- Denormalized for high-speed indexing & filtering
├── organization_id
├── lesson_id
└── student_id
```

> [!NOTE]
> Controlled denormalization is used sparingly for analytics, high-frequency progress writes, and indexing performance—not as a default rule for simple lookup tables.

---

# User Identity & Membership Model

EOS uses a **Global Identity** model across all tenants.

```text
                                  User Identity
                               (Global Account)
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
      Tenant A Membership                           Tenant B Membership
 (OrganizationMember in SkillYards)            (OrganizationMember in ABC College)
```

- **Single Identity:** One email address corresponds to one global `User` identity.
- **Tenant Memberships:** A user connects to tenants through `OrganizationMember` records.

---

# Organization Membership (`OrganizationMember`)

Within a tenant, access permissions and roles are established via `OrganizationMember`:

```text
User  ──(associates with)──>  OrganizationMember  ──(belongs to)──>  Organization
                                    │
                         ├── organization_id
                         ├── user_id
                         ├── role (Owner, Admin, Instructor, Student)
                         ├── status (Active, Suspended)
                         └── joined_at
```

### EOS v1 Business Rules
1. A user has **one global identity**.
2. A user may hold memberships across multiple tenants.
3. Within a given tenant, a user has **one active organization membership** in v1.
4. Future versions will support multi-organization switching within a single tenant without database migrations.

---

# Role & Permission Hierarchy

```text
Platform Scope
└── Super Admin (EOS System Operator)

Tenant & Organization Scope
├── Tenant Owner (Billing, Branding, Full Administration)
├── Organization Admin (Branch Admin, Course Management)
├── Instructor (Content Creation, Grading, Student Management)
└── Student (Learning Access, Submissions)
```

> [!IMPORTANT]
> Permissions are **never** assigned directly to raw `User` records. Permissions are derived dynamically from the active `OrganizationMember` role within the context of the active tenant.

---

# Request Resolution Pipeline

Every incoming HTTP request goes through a mandatory resolution pipeline before any use case logic executes:

```text
Incoming Request
       │
       ▼
1. Authenticate User (Decrypt JWT, identify User ID)
       │
       ▼
2. Resolve Tenant (Extract Tenant ID from JWT claim or X-Tenant-ID header)
       │
       ▼
3. Resolve Organization (Identify user's Organization context)
       │
       ▼
4. Verify Membership (Verify OrganizationMember record is Active)
       │
       ▼
5. Resolve Role & Permissions (Load Tenant Owner / Admin / Instructor / Student role)
       │
       ▼
6. Execute Application Use Case (Proceed with tenant-safe repositories)
```

> [!WARNING]
> If a request fails to resolve a valid tenant or active organization membership, the request is immediately rejected at the presentation layer with an HTTP `401 Unauthorized` or `403 Forbidden` response.

---

# Tenant Resolution Order

1. **Custom Domain (Future):** E.g., `learning.skillyards.com`
2. **Subdomain (Future):** E.g., `skillyards.eos.com`
3. **JWT Claim:** Encrypted `tenant_id` inside HTTP-only JWT cookie/auth header.
4. **API Header:** `X-Tenant-ID` header reserved for service-to-service and internal administration calls.

---

# Repository Strategy for Tenant Safety

Tenant isolation is strictly enforced at the **Repository Layer**. Business logic use cases must never manually construct raw SQL tenant filters.

### Repository Principles
- Repositories accept scoping parameters (`tenantId`, `organizationId`) on lookup methods.
- Queries automatically restrict scope using Drizzle ORM query builders.

#### Example Repository Interface:
```javascript
class CourseRepository {
  findById(courseId, organizationId) {
    // Ensures query includes organizationId constraint
  }

  findAllByOrganization(organizationId, pagination) {
    // Ensures scope is restricted to specified organization
  }
}
```

---

# Architectural Decision Records (ADRs)

---

## ADR-002: Shared Database, Shared Schema Architecture

### Status
**Accepted**

### Context
EOS must support hundreds of customer organizations cost-effectively while maintaining minimal operational maintenance overhead during initial scaling.

### Decision
Adopt a **Shared Database, Shared Schema** architecture using PostgreSQL. Tenant data isolation is enforced through relational ownership hierarchies and repository-level authorization scoping.

### Alternatives Evaluated
1. **Database-per-tenant:** High cost, complex schema migration routines across 100+ databases, idle resource waste.
2. **Schema-per-tenant:** Complex Drizzle migration pipelines, connection pool exhaustion per database instance.

### Pros
- Lowest infrastructure footprint and operating cost.
- Instant tenant onboarding without running DDL migrations.
- Simple unified database backup and schema migration pipeline.

### Cons
- Requires strict repository-level query scoping.
- High-volume noisy neighbor risk (mitigated by rate limiting and indexing).

### Future Path
Enterprise customers requesting isolated infrastructure can be migrated to dedicated PostgreSQL databases without altering application domain models.

---

## ADR-003: Global User Identity Model

### Status
**Accepted**

### Context
Users (students and instructors) may participate in courses across multiple institutions or transition between roles.

### Decision
Maintain a single **Global User Identity** record per person across EOS, while storing tenant-specific access rights inside `OrganizationMember`.

### Pros
- Single sign-on experience for users across institutions.
- Prevents user profile duplication.
- Simplifies cross-tenant analytics and universal certificates.

### Cons
- Requires decoupling authentication (`Identity`) from tenant membership (`Organization`).

---

# Guiding Principle

> **Every record must be traceable to exactly one tenant, either directly or through ownership relationships. Tenant isolation is enforced by architecture, not by developer discipline.**

# 05A-01 – Identity & Tenant Data Model

## Purpose

This document defines the core identity and tenancy data model for the Education Operating System (EOS).

It establishes how users, tenants, organizations, and memberships relate to one another and forms the structural foundation for authentication, authorization, Role-Based Access Control (RBAC), and all downstream bounded contexts.

---

# Core Design Principles

- **One Global Identity Per Person:** Single account per user across all tenants.
- **Multi-Tenant by Design:** Strict tenant isolation at data and membership levels.
- **Organization-Based Access Control:** Permissions derived from organization membership.
- **Flat Organization Hierarchy (v1):** Streamlined operations for branch networks.
- **Normalized Ownership:** Clear, non-duplicative ownership chains.
- **No Duplicated User Accounts:** Users maintain a single profile across institutions.
- **Future-Ready:** Built to support Enterprise Single Sign-On (SSO), OAuth, and multi-campus switching.

---

# Entity Relationship Diagram (ERD)

```text
                                  ┌──────────────┐
                                  │     User     │
                                  └──────┬───────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │ 1                                           1 │
                 ▼ ∞                                             ▼ ∞
    ┌──────────────────────────┐                    ┌──────────────────────────┐
    │   UserTenantMembership   │                    │  OrganizationMembership  │
    └────────────┬─────────────┘                    └────────────┬─────────────┘
                 │ ∞                                             │ ∞
                 ▼ 1                                             ▼ 1
            ┌──────────┐                            ┌──────────────────────────┐
            │  Tenant  │◄───────────────────────────│       Organization       │
            └──────────┘ 1                        ∞ └──────────────────────────┘
```

---

# 1. Identity Model (`User`)

Every person on the platform maintains **one global user record**.

### Table Schema: `users`

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  avatar            TEXT,
  phone             VARCHAR(50),
  timezone          VARCHAR(50) DEFAULT 'UTC',
  language          VARCHAR(10) DEFAULT 'en',
  email_verified_at TIMESTAMPTZ,
  status            VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, PENDING
  
  -- Audit Columns
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID,
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID,
  version           INTEGER NOT NULL DEFAULT 1
);
```

### Constraints & Indexes
- `email`: `UNIQUE`, `NOT NULL`
- `password_hash`: `NOT NULL`
- `idx_users_email`: B-tree index on `email`
- `idx_users_status`: B-tree index on `status`

---

# 2. Tenant Model (`Tenant`)

Represents a customer institution subscribing to EOS (e.g., SkillYards, ABC University, XYZ Coaching).

### Table Schema: `tenants`

```sql
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, PROVISIONING
  settings_json JSONB DEFAULT '{}'::jsonb,
  
  -- Audit Columns
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID,
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID,
  version       INTEGER NOT NULL DEFAULT 1
);
```

### Constraints & Indexes
- `slug`: `UNIQUE`, `NOT NULL` (e.g., `skillyards`, `abc-university`)
- `idx_tenants_slug`: Unique B-tree index on `slug`
- `idx_tenants_status`: B-tree index on `status`

---

# 3. Organization Model (`Organization`)

Organizations represent operational branches or units inside a tenant.

```text
SkillYards (Tenant)
├── Delhi Branch (Organization)
├── Mumbai Branch (Organization)
└── Bangalore Branch (Organization)
```

### Table Schema: `organizations`

```sql
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name          VARCHAR(255) NOT NULL,
  code          VARCHAR(50),
  status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  
  -- Audit Columns
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID,
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID,
  version       INTEGER NOT NULL DEFAULT 1
);
```

### Relationships & Rules
- `Tenant` (1) $\longrightarrow$ `Organization` ($\infty$)
- `tenant_id`: Foreign Key referencing `tenants.id` with `ON DELETE RESTRICT` (prevents silent destruction of tenant branch data).

---

# 4. UserTenantMembership Model (`UserTenantMembership`)

Connects a global user identity to a tenant. Answers: *"Is this user authorized to access this tenant?"*

### Table Schema: `user_tenant_memberships`

```sql
CREATE TABLE user_tenant_memberships (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  status         VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INVITED, SUSPENDED
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  
  -- Audit Columns
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_user_tenant UNIQUE (user_id, tenant_id)
);
```

---

# 5. OrganizationMembership Model (`OrganizationMembership`)

Defines a user's explicit operational role inside an organization. Answers: *"What actions can this user perform in this organization?"*

### Table Schema: `organization_memberships`

```sql
CREATE TABLE organization_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role            VARCHAR(50) NOT NULL, -- TENANT_OWNER, ORG_ADMIN, INSTRUCTOR, STUDENT
  status          VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ,
  
  -- Audit Columns
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);
```

### Standard Role Enum
- `TENANT_OWNER`: Full administrative, billing, and organizational authority across the tenant.
- `ORG_ADMIN`: Administrative control over courses, instructors, and students within the specific organization.
- `INSTRUCTOR`: Content creation, curriculum management, assignment grading, and student monitoring.
- `STUDENT`: Learning consumption, assessment submissions, and certificate viewing.

---

# Architectural Separation: Why Two Membership Tables?

Many LMS platforms make the mistake of combining tenant access and organization permissions into a single overloaded table. EOS explicitly separates identity gatekeeping from authorization scoping.

> [!IMPORTANT]
> ### Strategic Advantage of `UserTenantMembership` Upfront
> Even though EOS v1 primarily uses a single organization per tenant, introducing `UserTenantMembership` upfront gives a clean, dedicated place to manage:
> - **Tenant-level Invitations & Acceptances:** Handle tenant onboarding independently of specific branch/department assignments.
> - **Tenant-wide Suspensions & Statuses:** Lock out or deactivate a user across an entire institution instantly.
> - **Tenant Switching & Contexts:** Seamlessly switch between different tenant portals for users with multi-tenant access.
> - **Future Multi-Organization Expansion:** Support multi-branch teaching or campus transfers without overloading `OrganizationMembership`.
> 
> Most importantly, this small upfront decision avoids a disruptive schema migration down the road and cleanly preserves the principle of **keeping identity separate from authorization**.

| Table | Core Purpose | Answers |
| :--- | :--- | :--- |
| **`UserTenantMembership`** | Tenant Gateway Access | *"Can this person access the SkillYards tenant portal?"* |
| **`OrganizationMembership`** | Branch Context & Role | *"Is this person an Instructor or Student in the Delhi Branch?"* |

### Benefits of Separation
1. **Zero Schema Refactoring:** Multi-organization switching and campus transfers require no database migrations.
2. **Clean Status Management:** Tenant suspension operates independently from branch role permissions.
3. **Multi-Branch Flexibility:** Enables a user to teach in the Delhi branch while taking a course in the Mumbai branch.

---

# Cardinality & Business Rules

```text
User (1)  ──────────────  (∞) UserTenantMembership
Tenant (1)  ────────────  (∞) Organization
Organization (1)  ──────  (∞) OrganizationMembership
User (1)  ──────────────  (∞) OrganizationMembership
```

### Business Rules Summary
- A **User** has **one global identity** (unique email).
- A **User** may hold memberships across **multiple tenants**.
- In **EOS v1**, a user belongs to **one organization** per tenant. (Schema supports multiple memberships for future versions).
- An **Organization** belongs to **exactly one Tenant**.
- Organization codes or names may repeat across *different* tenants (e.g., Tenant A has a "Delhi" branch; Tenant B has a "Delhi" branch).

---

# Request Resolution SQL Patterns

### 1. User Authentication (Identity)
```sql
SELECT id, email, password_hash, status 
FROM users 
WHERE email = $1 AND deleted_at IS NULL;
```

### 2. Resolve Tenant Membership (Gateway Gatekeeper)
```sql
SELECT m.id, m.tenant_id, m.status, t.name, t.slug 
FROM user_tenant_memberships m
JOIN tenants t ON t.id = m.tenant_id
WHERE m.user_id = $1 AND m.tenant_id = $2 AND m.status = 'ACTIVE' AND t.status = 'ACTIVE';
```

### 3. Resolve Organization Role & Permissions
```sql
SELECT om.id, om.organization_id, om.role, om.status, o.name AS organization_name
FROM organization_memberships om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = $1 AND om.organization_id = $2 AND om.status = 'ACTIVE';
```

---

# Architectural Decision Records (ADRs)

---

## ADR-007: Global Identity Model

### Status
**Accepted**

### Context
Users (instructors, students, administrators) frequently participate across multiple institutions or switch roles over time.

### Decision
Maintain a single **Global Identity** (`users`) per person across EOS. Store tenant access inside `user_tenant_memberships` and branch permissions inside `organization_memberships`.

### Benefits
- Eliminates duplicate user accounts across tenants.
- Simplifies Single Sign-On (SSO) and OAuth integration.
- Provides a clean foundation for universal student portfolios and transcripts.

---

## ADR-008: Flat Organization Hierarchy (EOS v1)

### Status
**Accepted**

### Context
EOS v1 targets institutions operating branch networks (e.g. city branches, training centers) that require simple operational boundaries.

### Decision
Implement a **flat organization model** under each tenant (`Tenant` $\rightarrow$ `Organization`). Do not introduce recursive parent-child tree queries in v1.

### Benefits
- Highly performant query execution without complex recursive Common Table Expressions (CTEs).
- Simplified RBAC evaluation logic.
- Lower initial maintenance and migration overhead.

---

# Guiding Principle

> **Identity is global. Access is contextual. A user is defined once, while permissions and responsibilities are determined by their memberships within tenants and organizations.**

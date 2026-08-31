# 03 - Domain Model & Bounded Contexts

## Purpose

This document defines the business domains (Bounded Contexts) of the Education Operating System (EOS).

The purpose is to establish clear ownership boundaries, reduce coupling, and ensure every business capability belongs to a single domain.

EOS follows Domain-Driven Design (DDD), where each bounded context owns its business rules, data, and public interface.

---

# Domain Overview

```text
                           Education Operating System (EOS)
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
 Platform & Identity            Learning Platform           Platform Services
        │                             │                             │
  ├── Identity                 ├── Courses              ├── Files
  ├── Tenant                   ├── Enrollments         ├── Media (Video)
  ├── Organization             ├── Learning            ├── Notifications
  ├── Users                    ├── Assessments         ├── Billing
  └── Administration           └── Certificates        └── Analytics
```

---

# Architecture Principles for Bounded Contexts

Every business capability belongs to **exactly one** bounded context.

Each bounded context:
- **Owns its data** (No shared database tables)
- **Owns its business rules**
- **Exposes a public Application API**
- **Hides internal implementation details**
- **Can be independently tested**
- **Can be extracted into its own service** in the future if scale requires it

### Allowed Communication Rules

Modules communicate **only** through:
1. **Application Services (Synchronous):** Explicit public API calls within transaction boundaries.
2. **Domain Events (Asynchronous):** Decoupled event publishing for cross-context side-effects.

> [!CAUTION]
> Direct cross-context database querying or schema sharing is strictly prohibited.

---

# Bounded Context Definitions

---

## 1. Identity Context

### Responsibility
Authentication and identity verification.

### Owns
- Login & Logout logic
- JWT Generation & Verification
- Refresh Token Rotation
- Session Management
- Password Hashing & Reset Workflows
- MFA (Future)

### Does NOT Own
- User Profiles
- Roles & Permissions
- Organizations

---

## 2. Tenant Context

### Responsibility
Represents a customer organization subscribing to EOS (e.g., SkillYards, ABC College, XYZ Coaching Institute).

### Owns
- Tenant Entity & Metadata
- White-label Branding Configurations
- Custom Domains & Routing
- Feature Flags & Entitlements
- Subscription Plan Configuration

### Structural Relationship
```text
Tenant
  │
  ├── Organization A (e.g. Main Campus)
  ├── Organization B (e.g. Distance Learning)
  └── Organization C (e.g. Corporate Branch)
```

---

## 3. Organization Context

### Responsibility
Represents branches or operational units within a tenant.

### Examples
```text
SkillYards (Tenant)
├── Delhi (Organization)
├── Mumbai (Organization)
└── Bangalore (Organization)
```

### Owns
- Organization Aggregate
- Organization Membership (`OrganizationMember`)
- Organization Settings

### Important Entity: `OrganizationMember`
Associates `Users` with `Organizations`.

Responsibilities:
- Role Assignment (Owner, Admin, Instructor, Student)
- Invitation Status & Acceptance
- Membership Status (Active, Suspended)
- Date Joined

> [!IMPORTANT]
> **EOS v1 Business Rule:** One user may have only **one active organization membership**. The schema is designed so future expansion to multi-organization memberships will require zero database redesign.

---

## 4. Users Context

### Responsibility
Represents people using the platform.

### Owns
- User Profile Details
- Avatar & Media Assets
- Contact Information & Email
- Personal Preferences & Locales
- Timezone Settings

> [!NOTE]
> Authentication concerns belong exclusively to the **Identity** context.

### Architectural Decision: Student & Instructor as Roles

> [!TIP]
> `Student` and `Instructor` are **NOT** separate entities in EOS. They are **roles** assigned to a user through `OrganizationMember`.

```text
User  ──(associated with)──>  OrganizationMember  ──(assigned)──>  Role
```

#### Roles:
- **Tenant Owner**
- **Organization Admin**
- **Instructor**
- **Student**

This avoids data duplication and allows a user to become an instructor or admin seamlessly.

---

## 5. Courses Context

### Responsibility
Management of all learning content offerings.

### Owns
- Courses Aggregate
- Curriculum Structure
- Modules & Sections
- Lessons Metadata
- Learning Resources & Attachments
- Course Metadata & Publishing State

### Course Ownership Flow
Courses belong to Organizations:

```text
Organization  ──(owns)──>  Courses  ──(owns)──>  Curriculum  ──(contains)──>  Lessons
```

Each organization controls:
- Curriculum structure
- Lesson publishing
- Course pricing & availability
- Assigned Instructors

---

## 6. Enrollments Context

### Responsibility
Represents the participation relationship between Users and Courses.

### Owns
- Enrollment Entity
- Enrollment Status (Active, Completed, Cancelled, Expired)
- Enrollment & Expiration Dates
- Access Rights

> [!NOTE]
> Does **NOT** track lesson progress or video resume positions (owned by **Learning**).

---

## 7. Learning Context

### Responsibility
Tracks student learning progress and engagement.

### Owns
- Lesson Progress & Completion Tracking
- Video Watch History & Time Markers
- Resume Position (last playback timestamp)
- Course Completion Status Calculation

> [!NOTE]
> Learning logic references Course IDs but does **NOT** own Courses.

---

## 8. Assessments Context

### Responsibility
Evaluations, testing, and grading workflows.

### Owns
- Quizzes & Exams
- Question Banks & Question Types
- Student Assessment Attempts
- Automated & Manual Scoring
- Grading Rubrics & Results

---

## 9. Certificates Context

### Responsibility
Certification issuance and validation.

### Owns
- Certificate Generation
- Certificate Verification (Public URLs / Verification Hashes)
- Certificate Revocation
- Certificate Templates & Metadata

---

## 10. Files Context

### Responsibility
Generic file and document management.

### Owns
- Document Uploads & Metadata
- PDFs, Worksheets, Images
- File Attachments
- Storage Provider Integration (`StorageProvider`)

> [!NOTE]
> Files context handles generic document storage. It does **NOT** process or transcode video streams.

---

## 11. Media Context

### Responsibility
Video media pipeline and streaming asset processing.

### Owns
- Video Upload Pipeline
- FFmpeg Transcoding Jobs
- Adaptive HLS Stream Generation (`.m3u8` / `.ts`)
- Video Thumbnail Extraction
- Video Streaming Metadata

### Dependencies
- Uses `StorageProvider` for segment persistence.
- Uses `FFmpegProvider` for video processing.

---

## 12. Notifications Context

### Responsibility
Multi-channel messaging and communication.

### Owns
- Transactional Emails
- In-App Notifications
- Push Notifications (Future)
- Notification Templates & Logs

### Dependencies
- Uses `NotificationProvider` and `MailProvider`.

---

## 13. Billing Context

### Responsibility
Monetization, pricing, and subscription management.

### Owns
- Subscription Plans
- Tenant Subscriptions
- Invoices & Statements
- Payment Transactions
- Usage Limits & Metering

---

## 14. Analytics Context

### Responsibility
Reporting and business intelligence.

### Owns
- Platform Dashboards
- Key Performance Indicators (KPIs)
- Student Learning Analytics
- Revenue & Engagement Reports

> [!IMPORTANT]
> Analytics workflows must operate asynchronously and **never** block primary transactional API operations.

---

## 15. Administration Context

### Responsibility
Platform-wide administration and governance.

### Owns
- System Audit Logs
- Global Feature Flags
- Platform Configuration
- System Maintenance Windows
- Global Administrative Controls

---

# Module Communication

```text
                       Module Communication Channels
                                     │
            ┌────────────────────────┴────────────────────────┐
            │                                                 │
 Synchronous Communication                         Asynchronous Communication
 (via Application API)                             (via Domain Events)
            │                                                 │
            ▼                                                 ▼
 Course Application Service                        Domain Event Dispatcher
 (Direct in-process call inside transaction)        (In-memory / SQS / RabbitMQ)
```

---

# Shared Kernel (`packages/core`)

The shared kernel package contains **only technical building blocks**.

### Included Building Blocks:
- `Entity`
- `AggregateRoot`
- `ValueObject`
- `Result`
- `DomainEvent`
- `AppError`
- `UniqueId`

> [!CAUTION]
> Business concepts, domain entities, or domain-specific logic must **never** be placed inside `packages/core`.

---

# Ubiquitous Language

| Term | Meaning |
| :--- | :--- |
| **Tenant** | A customer organization subscribing to EOS (e.g. SkillYards). |
| **Organization** | A branch or operational unit within a tenant (e.g. Delhi Branch). |
| **User** | An individual person accessing the platform. |
| **Organization Member** | A user's explicit membership and assigned role within an organization. |
| **Course** | A structured learning offering. |
| **Curriculum** | The hierarchical module and lesson structure of a course. |
| **Lesson** | An individual learning unit (video, text, quiz, or assignment). |
| **Enrollment** | A student's registered participation in a specific course. |
| **Assessment** | A quiz or exam designed to test learning outcomes. |
| **Certificate** | A verifiable proof of course completion. |

---

# Design Rules

1. Every business capability belongs to **one** bounded context.
2. Every module **owns its own data**; database sharing between modules is prohibited.
3. Cross-module communication occurs **only** through public Application Services or Domain Events.
4. `Student` and `Instructor` are **roles** attached to `OrganizationMember`, not separate entities.
5. Courses own their curriculum, modules, and lessons.
6. Business rules remain 100% independent of frameworks, databases, and HTTP drivers.

---

# Guiding Principle

> **Every bounded context owns one business capability, its data, its rules, and its public interface. Nothing else.**

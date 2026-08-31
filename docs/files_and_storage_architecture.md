# 05F – Files & Storage Architecture

## Purpose

This document defines the file storage architecture for the Education Operating System (EOS).

It establishes a provider-agnostic abstraction for uploading, storing, retrieving, securing, and managing files across all platform domain modules, including video files, HLS manifests, PDF documents, certificates, user avatars, assignment submissions, exports, and reports.

---

# Core Design Principles

- **Provider Agnostic:** Decoupled behind a unified `StorageProvider` abstraction.
- **First-Class Domain Entities:** Every stored object is tracked as a `File` entity in the database.
- **Abstracted Physical Storage:** Domain modules never interact with raw bucket keys or storage SDKs directly.
- **UUID-Based Storage Keys:** Physical storage paths use UUID v7 keys to prevent collisions and enumeration attacks.
- **Soft Delete with Background Cleanup:** Immediate soft deletes followed by asynchronous worker lifecycle cleanup.
- **Immutable Storage Objects:** Physical storage objects are immutable once finalized.
- **Secure by Default:** Default file visibility is `PRIVATE`; access requires short-lived presigned URLs.

---

# Architecture Overview

```text
Application Use Cases (Media, Users, Courses, Certificates)
                       │
                       ▼
            StorageProvider Interface
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
 Cloudflare R2      AWS S3      Local Storage (Dev)
```

Domain modules interact **exclusively** with the `StorageProvider` abstraction interface in `@eos/infra-storage`.

---

# Entity Relationship Diagram (ERD)

```text
┌──────────────────────┐         ┌──────────────────────┐
│  Domain Modules      │         │      File Entity     │
│ (Users, Media, etc.) ├────────►│ (Metadata & Context) │
└──────────────────────┘         └──────────┬───────────┘
                                            │ 1
                                            ▼ 1
                                 ┌──────────────────────┐
                                 │   StorageProvider    │
                                 │ (Physical Object Key)│
                                 └──────────────────────┘
```

---

# 1. File Entity Model (`File`)

Represents a stored file asset in the system.

### Table Schema: `files`

```sql
CREATE TABLE files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  storage_provider  VARCHAR(50) NOT NULL DEFAULT 'R2', -- R2, S3, LOCAL, MINIO, AZURE
  storage_key       VARCHAR(500) NOT NULL UNIQUE,      -- files/{tenant_id}/{file_uuid}
  bucket            VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type         VARCHAR(100) NOT NULL,
  extension         VARCHAR(20),
  size_bytes        BIGINT NOT NULL DEFAULT 0,
  checksum_sha256   VARCHAR(64),
  visibility        VARCHAR(50) NOT NULL DEFAULT 'PRIVATE', -- PRIVATE, PROTECTED, PUBLIC
  status            VARCHAR(50) NOT NULL DEFAULT 'UPLOADING', -- UPLOADING, READY, PROCESSING, ARCHIVED, DELETED
  uploaded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Audit Columns
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID
);
```

---

# 2. File Visibility & Statuses

### Visibility Modes
- **`PRIVATE` (Default):** Accessible strictly via short-lived presigned URLs generated for authorized users.
- **`PROTECTED`:** Accessible by any authenticated user within the tenant.
- **`PUBLIC`:** Globally accessible via CDN (e.g. public avatars, course preview thumbnails).

### File Status Lifecycle
```text
UPLOADING  ──(Upload Verified)──>  READY  ──(Optional Worker)──>  PROCESSING  ──>  ARCHIVED
                                      │
                                      └──(Soft Deleted)──>  DELETED  ──(Worker Cleanup)──>  Purged
```

---

# 3. Storage Key Layout

Physical storage keys omit original user filenames to guarantee path safety and prevent enumeration:

```text
files/{tenant_id}/{file_uuid}
```

#### Example Key:
```text
files/01917f8a-9c42-7a1b-8c4d-123456789abc/01917f8b-1122-7334-9aa1-fedcba987654
```
*Note: Original filenames (e.g., `My_Assignment_Final_v2.pdf`) are stored exclusively in the `files.original_filename` database column.*

---

# 4. Upload & Download Workflows

```text
                          Presigned Upload Workflow
Client                   Fastify API API                 StorageProvider (R2)
  │                            │                                 │
  ├── 1. Request Upload ──────►│                                 │
  │    (filename, size)        ├── 2. Create File Record         │
  │                            │    (status: UPLOADING)          │
  │                            ├── 3. Generate Presigned PUT URL │
  │◄── 4. Return Presigned URL ┼─────────────────────────────────┘
  │       & File ID            │
  │                            │
  ├── 5. Direct PUT Upload ─────────────────────────────────────►│
  │    (Raw binary stream)     │                                 │
  │                            │                                 │
  ├── 6. Confirm Upload ──────►│                                 │
  │    (File ID)               ├── 7. Verify Checksum & Size    │
  │                            ├── 8. Mark File READY            │
  │◄── 9. Upload Complete ─────┴─────────────────────────────────┘
```

### Presigned Download Workflow
Application servers **never** proxy or stream large file binaries.
1. Client requests access to a file.
2. Fastify API verifies user authorization.
3. API calls `StorageProvider.generateDownloadUrl(storageKey, 900)` (expires in 15 mins).
4. API redirects client directly to the presigned storage URL.

---

# 5. Retention & Lifecycle Deletion Policy

When a user deletes a file, the API immediately sets `deleted_at = NOW()` (soft delete). A background lifecycle worker process (`apps/worker`) periodically purges expired objects from physical storage.

### Standard Retention Schedule

| File Category | Retention Period | Purge Action |
| :--- | :--- | :--- |
| **Video Streams & Assets** | Permanent | Requires manual administrative approval. |
| **Issued Certificates** | Permanent | Never purged. |
| **Replaced User Avatars** | 30 Days | Purged automatically by worker. |
| **Assignment Uploads** | Tenant Configurable | Purged after course offering archiving. |
| **Temporary PDF Exports** | 7 Days | Purged automatically. |
| **Failed / Abandoned Uploads**| 24 Hours | Purged automatically. |

---

# 6. Provider Abstraction Interface (`StorageProvider`)

All infrastructure storage drivers (Cloudflare R2, AWS S3, Local Storage, MinIO) implement the exact same abstract class:

```javascript
class StorageProvider {
  async upload(storageKey, bufferOrStream, options) {}
  async delete(storageKey) {}
  async copy(sourceKey, targetKey) {}
  async move(sourceKey, targetKey) {}
  async exists(storageKey) {}
  async generateUploadUrl(storageKey, expiresInSeconds, mimeType) {}
  async generateDownloadUrl(storageKey, expiresInSeconds) {}
  async getMetadata(storageKey) {}
}
```

---

# Architectural Refinement: Future `StorageObject` Entity Path

> [!TIP]
> ### Evolution Path for Deduplication & Object Versioning
> In high-scale corporate enterprise deployments, storing duplicate copies of identical files (e.g. popular PDFs uploaded by 500 students) wastes storage.
> If deduplication becomes a business requirement in future releases, EOS can introduce a `StorageObject` entity:
> ```text
> File (Business Object)  ──>  StorageObject (Physical Blob in R2/S3)
> ```
> For v1, maintaining a single `File` entity provides maximum simplicity, zero reference-counting bugs, and high developer velocity while preserving a clean migration pathway.

---

# Recommended Indexes

```sql
-- File Indexes
CREATE INDEX idx_files_tenant_id ON files(tenant_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_status_visibility ON files(status, visibility);
CREATE INDEX idx_files_checksum ON files(checksum_sha256);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-019: File as a First-Class Domain Entity

### Status
**Accepted**

### Context
Multiple bounded contexts (Users, Courses, Assessments, Certificates, Media) require storing and managing file attachments.

### Decision
Model every stored object as a `File` entity with rich database metadata, visibility rules, and audit logs.

### Benefits
- Unified file management model across the entire monorepo.
- Consistent presigned URL authorization.
- Centralized retention and deletion workers.

---

## ADR-020: UUID v7 Storage Keys

### Status
**Accepted**

### Context
Using raw filenames in cloud storage buckets leads to character encoding bugs, path collisions, and security vulnerabilities.

### Decision
Format all physical storage keys as `files/{tenant_id}/{file_uuid}` using UUID v7 identifiers.

### Benefits
- Zero filename collisions.
- Path obfuscation prevents enumeration attacks.
- Immutable storage key paths.

---

## ADR-021: Soft Delete with Background Lifecycle Purging

### Status
**Accepted**

### Context
Accidental file deletion by users causes irrecoverable loss of student homework or certificates.

### Decision
Perform immediate soft deletes (`deleted_at = NOW()`) on API requests, leaving physical byte purging to background lifecycle workers.

### Benefits
- Instant file recovery window for administrators.
- Prevents blocking HTTP requests on cloud storage delete calls.

---

# Guiding Principle

> **Files are independent domain assets. The application owns metadata and permissions, while the storage provider owns only the physical bytes. This separation keeps EOS cloud-agnostic, secure, and easy to evolve.**

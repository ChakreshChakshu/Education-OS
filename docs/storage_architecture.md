# 11 – Storage Architecture

## Purpose

This document defines the file storage architecture for the Education Operating System (EOS).

It establishes a multi-tenant, cloud-agnostic storage infrastructure operating behind a `StorageProvider` abstraction. It governs object key conventions, direct client uploads via presigned URLs, file asset metadata schemas, soft deletes, and scheduled background lifecycle cleanup.

---

# Core Design Principles

- **Object Storage First:** Decoupled cloud storage operating independently of API compute.
- **Provider Abstraction:** All application modules interact through a unified `StorageProvider` contract.
- **Direct Browser Uploads:** Clients stream binaries directly to storage buckets via presigned PUT URLs.
- **Immutable Object Keys:** Physical paths use UUID v7 keys rather than user-supplied filenames.
- **File Asset Domain Abstraction:** Centralized `file_assets` schema models metadata across all bounded contexts.
- **Multi-Tenant Isolation:** Enforced tenant prefix scoping (`tenants/{tenantId}/...`) and DB-level ownership authorization.
- **Signed Short-Lived Access:** Private assets accessed via temporary presigned GET URLs (10-minute validity).
- **Soft Delete with Background Cleanup:** Immediate soft delete (`deleted_at`) followed by background retention purging (30-day default).

---

# High-Level Architecture

```text
Browser Client                     Fastify API               StorageProvider              Cloudflare R2 Object Storage
      │                                 │                          │                                 │
      ├── 1. Request Upload URL ───────►│                          │                                 │
      │    (POST /files/upload-url)     ├── 2. Generate Key & URL ─►│                                 │
      │◄── 3. Return Presigned PUT URL ─┼──────────────────────────┼─────────────────────────────────┘
      │                                 │                          │
      ├── 4. Direct PUT Binary Upload ─────────────────────────────┼────────────────────────────────►│
      │                                 │                          │                                 │
      ├── 5. Confirm Upload Complete ──►│                          │                                 │
      │    (POST /files/{id}/complete)  ├── 6. Verify & Save Asset  │                                 │
      │◄── 7. Upload Confirmed ─────────┴──────────────────────────┴─────────────────────────────────┘
```

---

# Provider Abstraction Interface (`StorageProvider`)

Domain modules never call AWS S3, Cloudflare R2, or MinIO SDKs directly. Drivers implement the standard `StorageProvider` contract:

```javascript
class StorageProvider {
  async createUploadUrl(objectKey, expiresInSeconds, mimeType) {}
  async createDownloadUrl(objectKey, expiresInSeconds) {}
  async upload(objectKey, bufferOrStream, options) {}
  async delete(objectKey) {}
  async exists(objectKey) {}
  async copy(sourceKey, targetKey) {}
  async move(sourceKey, targetKey) {}
  async metadata(objectKey) {}
}
```

---

# Single Bucket Strategy & Prefix Layout

EOS standardizes on a single root storage bucket (`eos-storage`) organized via strict logical prefixes:

```text
eos-storage/
└── tenants/
    └── {tenant_id}/
        ├── avatars/
        ├── videos/
        ├── documents/
        ├── certificates/
        ├── assignments/
        ├── exports/
        └── temp/
```

### Benefits of Single Bucket Layout
- Eliminates cloud provider bucket limits and proliferation overhead.
- Simplifies multi-tenant disaster recovery backups.
- Centralizes retention lifecycle policies.

---

# 1. File Asset Model (`file_assets`)

Represents stored file metadata across all platform modules.

### Table Schema: `file_assets`

```sql
CREATE TABLE file_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  provider        VARCHAR(50) NOT NULL DEFAULT 'R2', -- R2, S3, LOCAL, AZURE
  bucket          VARCHAR(255) NOT NULL,
  object_key      VARCHAR(500) NOT NULL UNIQUE,     -- tenants/{tenantId}/documents/{fileId}
  original_name   VARCHAR(255) NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  extension       VARCHAR(20),
  size_bytes      BIGINT NOT NULL DEFAULT 0,
  checksum        VARCHAR(64),                      -- SHA-256 Hash
  visibility      VARCHAR(50) NOT NULL DEFAULT 'PRIVATE', -- PRIVATE, PUBLIC
  status          VARCHAR(50) NOT NULL DEFAULT 'UPLOADING', -- UPLOADING, UPLOADED, AVAILABLE, DELETED
  metadata_json   JSONB DEFAULT '{}'::jsonb,        -- EXIF, width, height, duration
  
  -- Audit Columns
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
```

---

# Immutable Object Key Naming Conventions

To prevent path traversal, filename collisions, and user enumeration attacks, physical storage keys omit user filenames:

```text
tenants/{tenantId}/avatars/{fileId}
tenants/{tenantId}/videos/{videoId}
tenants/{tenantId}/documents/{fileId}
tenants/{tenantId}/certificates/{fileId}
tenants/{tenantId}/assignments/{submissionId}
tenants/{tenantId}/temp/{fileId}
```

---

# Download & Visibility Strategy

### 1. Private Assets (`visibility = 'PRIVATE'`)
Used for assignments, internal video segments, certificates, and student documents.
- API authenticates user request and verifies tenant access.
- API calls `StorageProvider.createDownloadUrl(objectKey, 600)` (10-minute expiration).
- Client downloads directly from storage via short-lived URL.

### 2. Public Assets (`visibility = 'PUBLIC'`)
Used for organization logos, course preview thumbnails, and public avatars.
- Distributed directly via CDN static cache URLs.

---

# Lifecycle & Background Cleanup Worker

```text
UPLOADING ──> UPLOADED ──> AVAILABLE ──(User Delete)──> SOFT DELETED (deleted_at)
                                                               │
                                                               ▼ (30 Days Retention)
                                                      Purged by Cleanup Worker
```

### Scheduled Cleanup Worker Responsibilities (`apps/worker`)
- Purge objects soft-deleted over 30 days ago.
- Delete expired abandoned temporary files in `temp/` older than 24 hours.
- Reconcile orphaned physical storage objects missing database metadata.

---

# Recommended Indexes

```sql
-- Storage Indexes
CREATE INDEX idx_file_assets_tenant_id ON file_assets(tenant_id);
CREATE INDEX idx_file_assets_object_key ON file_assets(object_key);
CREATE INDEX idx_file_assets_checksum ON file_assets(checksum);
CREATE INDEX idx_file_assets_status_deleted ON file_assets(status, deleted_at);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-039: Storage Provider Interface Abstraction

### Status
**Accepted**

### Context
Direct coupling to provider SDKs (AWS S3) causes vendor lock-in and complicates local offline development.

### Decision
Wrap all storage drivers behind a `StorageProvider` abstraction.

### Benefits
- Seamless cloud provider portability (Cloudflare R2, AWS S3, MinIO, Local).
- Easy unit testing using mock storage drivers.

---

## ADR-040: Single Bucket with Tenant Logical Prefixes

### Status
**Accepted**

### Context
Creating separate cloud storage buckets per tenant results in operational overhead and deployment limits.

### Decision
Use a single storage bucket with `tenants/{tenantId}/` logical key prefixes.

### Benefits
- Simplified backup, replication, and monitoring setup.
- Infinite tenant scaling without infrastructure provisioning delays.

---

## ADR-041: File Asset Domain Metadata Entity

### Status
**Accepted**

### Context
Domain modules require rich file metadata (MIME types, file sizes, SHA-256 checksums, image dimensions) that storage providers do not natively track.

### Decision
Model all stored objects as a `FileAsset` entity in the relational database.

### Benefits
- Fast metadata querying without cloud network calls.
- Centralized audit trail and soft-delete recovery.

---

## ADR-042: Soft Delete Retention Policy

### Status
**Accepted**

### Context
Accidental file deletion causes immediate loss of student submissions or academic certificates.

### Decision
Mark deleted assets with `deleted_at = NOW()` and defer physical byte removal to a background worker process after a 30-day retention window.

### Benefits
- Accidental deletion recovery.
- Non-blocking HTTP deletion requests.

---

# Guiding Principle

> **Storage is treated as an infrastructure concern behind a provider-agnostic abstraction. Every stored object is represented by a File Asset, uploaded directly to object storage, accessed through signed URLs, and managed through lifecycle policies. This approach provides secure multi-tenant storage today while remaining flexible for future cloud providers, compliance requirements, and advanced storage capabilities.**

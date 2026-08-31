# 05E – Media & Video Architecture

## Purpose

This document defines the media and video architecture for the Education Operating System (EOS).

It establishes how videos are uploaded, transcoded via FFmpeg into adaptive HLS streams (`.m3u8`), attached to lessons as reusable assets, and managed across cloud storage providers while remaining cloud-agnostic.

---

# Core Design Principles

- **Media Reusability:** Media assets are reusable across multiple lessons or courses without duplicating physical files.
- **Indirect Media References:** Lessons reference `MediaAsset` records, never raw storage paths or URLs.
- **Upload Once, Use Everywhere:** Single upload pipeline; reusable across tenants and organizations.
- **Asynchronous Transcoding Pipeline:** Video transcoding occurs in background workers (`apps/worker`) via queue jobs.
- **Provider-Agnostic Storage:** Decoupled behind `StorageProvider` abstractions.
- **Uniform `File` Entity Standardization:** Every physical asset (original MP4, master playlist, quality variants, thumbnails, subtitles) is represented uniformly by a centralized `File` entity.

---

# Architecture Overview

```text
Lesson
  │
  ▼
LessonMedia (Junction)
  │
  ▼
MediaAsset (Reusable Domain Asset)
  │
  ├──────────────┐
  ▼              ▼
Video         Document Attachment
  │
  ├── Original File (File Entity)
  │
  ├── VideoVariants (File Entities: 240p, 360p, 480p, 720p, 1080p)
  │
  ├── HLS Master Playlist (File Entity: master.m3u8)
  │
  └── Subtitles (File Entities: VTT / SRT)
```

---

# Entity Relationship Diagram (ERD)

```text
                             ┌──────────────────┐
                             │      Lesson      │
                             └────────┬─────────┘
                                      │ 1
                                      ▼ ∞
                             ┌──────────────────┐
                             │   LessonMedia    │
                             └────────┬─────────┘
                                      │ ∞
                                      ▼ 1
                             ┌──────────────────┐
                 ┌───────────┤    MediaAsset    ├───────────┐
                 │           └────────┬─────────┘           │
               1 │                  1 │                     │ 1
                 ▼ 1                  ▼ 1                   ▼ ∞
        ┌──────────────────┐ ┌──────────────────┐  ┌──────────────────┐
        │  FileAttachment  │ │      Video       │  │  MediaMetadata   │
        └──────────────────┘ └────────┬─────────┘  └──────────────────┘
                                      │ 1
                                      ▼ ∞
                             ┌──────────────────┐
                 ┌───────────┤   VideoVariant   ├───────────┐
                 │           └──────────────────┘           │
               1 │                                        1 │
                 ▼ 1                                        ▼ ∞
        ┌──────────────────┐                       ┌──────────────────┐
        │   File Entity    │                       │     Subtitle     │
        │ (master.m3u8 /   │                       └──────────────────┘
        │  variant.m3u8)   │
        └──────────────────┘
```

---

# 1. MediaAsset Model (`MediaAsset`)

Represents any reusable educational media asset.

### Table Schema: `media_assets`

```sql
CREATE TABLE media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  type            VARCHAR(50) NOT NULL, -- VIDEO, PDF, IMAGE, AUDIO, ZIP, SUBTITLE, DOCUMENT
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  status          VARCHAR(50) NOT NULL DEFAULT 'UPLOADING', -- UPLOADING, PROCESSING, READY, FAILED
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Audit Columns
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID,
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID,
  version         INTEGER NOT NULL DEFAULT 1
);
```

---

# 2. LessonMedia Junction Model (`LessonMedia`)

Connects lessons to reusable media assets.

### Table Schema: `lesson_media`

```sql
CREATE TABLE lesson_media (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  lesson_id      UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_required    BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_lesson_media UNIQUE (lesson_id, media_asset_id)
);
```

---

# 3. Video Model (`Video`)

Stores metadata for video assets.

### Table Schema: `videos`

```sql
CREATE TABLE videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  media_asset_id    UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  original_file_id  UUID NOT NULL, -- References uniform File entity (05F Files & Storage)
  master_file_id    UUID,          -- References uniform File entity for master.m3u8
  duration_seconds  INTEGER DEFAULT 0,
  width             INTEGER,
  height            INTEGER,
  fps               NUMERIC(5, 2),
  codec             VARCHAR(50),
  bitrate           INTEGER,
  processing_status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED', -- UPLOADED, QUEUED, PROCESSING, READY, FAILED
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 4. VideoVariant Model (`VideoVariant`)

Represents individual transcoded quality resolution profiles.

### Table Schema: `video_variants`

```sql
CREATE TABLE video_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  video_id         UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  resolution       VARCHAR(20) NOT NULL, -- 240p, 360p, 480p, 720p, 1080p
  bitrate          INTEGER NOT NULL,
  playlist_file_id UUID NOT NULL, -- References uniform File entity for resolution index.m3u8
  size_bytes       BIGINT DEFAULT 0,
  
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_video_resolution UNIQUE (video_id, resolution)
);
```

---

# 5. Subtitle Model (`Subtitle`)

Captures closed captioning and subtitle files.

### Table Schema: `subtitles`

```sql
CREATE TABLE subtitles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  language   VARCHAR(10) NOT NULL, -- en, es, fr, hi
  file_id    UUID NOT NULL, -- References uniform File entity (VTT / SRT)
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# Architectural Recommendation: Uniform `File` Entity Standardization

> [!IMPORTANT]
> ### Unified Storage Abstraction
> Rather than letting `Video`, `VideoVariant`, and `Subtitle` reference disparate storage keys or URLs, **every physical file in the platform** is represented uniformly by a single `File` entity in `@eos/infra-storage` (05F – Files & Storage):
> ```text
> File Record
> ├── original.mp4       (File record)
> ├── master.m3u8        (File record)
> ├── 720p/index.m3u8    (File record)
> ├── thumbnail.jpg      (File record)
> └── subtitle_en.vtt    (File record)
> ```
> **Benefits:**
> - **Unified Storage Abstraction:** Single lifecycle manager across Cloudflare R2, AWS S3, or MinIO.
> - **Unified Permissions & Security:** Single authorization gate for generating presigned URLs.
> - **Zero Storage Leakage:** Centralized file cleanup routines upon media asset deletion.

---

# Asynchronous Transcoding Pipeline

```text
Client Uploads Original MP4  ──>  File Record Created  ──>  Queue Job Dispatched (TranscodeVideoJob)
                                                                       │
                                                                       ▼
Media Marked READY  <──  Upload Variants & Master  <──  FFmpeg Processing (Worker App)
                                                        ├── Extract Metadata (width, height, duration)
                                                        ├── Generate 240p, 360p, 480p, 720p, 1080p HLS
                                                        ├── Package TS segments & master.m3u8
                                                        └── Extract video poster thumbnails
```

### Worker Responsibilities (`apps/worker`)
- Extract video parameters (resolution, codec, duration) via `ffprobe`.
- Transcode MP4 into HLS multi-bitrate variant playlists (`index.m3u8`) and `.ts` transport stream segments.
- Generate poster thumbnails (`.jpg`) at 25%, 50%, and 75% video completion markers.
- Register generated HLS playlists as `File` records and link them to `VideoVariant`.

---

# Storage Directory Layout

```text
media/
└── {tenant_id}/
    └── {media_asset_id}/
        ├── original/
        │   └── video.mp4
        ├── variants/
        │   ├── master.m3u8
        │   ├── 240p/
        │   │   ├── index.m3u8
        │   │   └── seg-001.ts
        │   ├── 720p/
        │   │   ├── index.m3u8
        │   │   └── seg-001.ts
        │   └── 1080p/
        │       ├── index.m3u8
        │       └── seg-001.ts
        └── thumbnails/
            └── poster.jpg
```

---

# Recommended Indexes

```sql
-- MediaAsset Indexes
CREATE INDEX idx_media_assets_org_type ON media_assets(organization_id, type);
CREATE INDEX idx_media_assets_status ON media_assets(status);

-- LessonMedia Indexes
CREATE INDEX idx_lesson_media_lesson ON lesson_media(lesson_id);
CREATE INDEX idx_lesson_media_asset ON lesson_media(media_asset_id);

-- Video Indexes
CREATE INDEX idx_videos_asset_status ON videos(media_asset_id, processing_status);
CREATE INDEX idx_variants_video_resolution ON video_variants(video_id, resolution);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-016: MediaAsset Domain Abstraction

### Status
**Accepted**

### Context
Lessons consume various media types (videos, documents, slides, audio clips). Coupling lessons directly to physical video URLs limits reusability and creates data duplication.

### Decision
Introduce the `MediaAsset` domain entity. Lessons reference `MediaAsset` records via `LessonMedia`.

### Benefits
- Reusable content across courses and lessons.
- Significant storage cost reduction.
- Clean decoupling between learning domain and media infrastructure.

---

## ADR-017: Asynchronous Worker Video Transcoding

### Status
**Accepted**

### Context
Video transcoding is computationally heavy and cannot run synchronously inside HTTP API request handlers.

### Decision
Offload transcoding jobs to asynchronous background workers (`apps/worker`) using a queue provider (`QueueProvider`).

### Benefits
- Fast HTTP responses for video upload initialization.
- Independent horizontal scaling of GPU/CPU transcoding workers.

---

## ADR-018: HLS Adaptive Bitrate Streaming

### Status
**Accepted**

### Context
Learners access platform content across variable mobile network conditions (3G/4G/5G/WiFi).

### Decision
Standardize video streaming on **HTTP Live Streaming (HLS)** with multi-resolution variant manifests (`.m3u8`).

### Benefits
- Seamless adaptive bitrate playback.
- CDN-friendly segment caching.
- Native support across iOS, Android, and web browsers (`video.js`).

---

# Guiding Principle

> **Media is a reusable domain asset. Lessons consume media through references, while the storage layer, transcoding pipeline, and delivery mechanism remain completely independent of the academic domain.**

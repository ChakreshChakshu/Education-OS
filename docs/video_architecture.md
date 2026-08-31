# 10 – Video Architecture

## Purpose

This document defines the video upload, processing, storage, and streaming architecture for the Education Operating System (EOS).

It establishes how raw video uploads are ingested directly into object storage via presigned URLs, asynchronously transcoded via FFmpeg into HTTP Live Streaming (HLS) multi-bitrate playlists (`.m3u8`), wrapped in a `VideoAsset` abstraction, and distributed globally through a Content Delivery Network (CDN).

---

# Core Design Principles

- **Direct Object Storage Uploads:** Browser uploads raw binaries directly to Cloudflare R2 via presigned URLs; API servers never stream large video payloads.
- **Video Asset Abstraction:** A single video asset encapsulates original MP4s, HLS master playlists, resolution variants, poster thumbnails, and subtitle files.
- **Asynchronous Worker Transcoding:** Non-blocking FFmpeg processing executed by background worker processes (`apps/worker`).
- **Adaptive Bitrate Streaming (HLS):** Automatic client-side quality switching (1080p, 720p, 480p, 360p) based on real-time network conditions.
- **Immutable Storage Objects:** Generated HLS manifests and segment files use time-ordered UUID keys.
- **Original Asset Preservation:** Raw master uploads are preserved indefinitely for re-transcoding, AI transcription, and new codec adoption (AV1/HEVC).

---

# High-Level Architecture

```text
Browser Client                    Fastify API              Cloudflare R2 Object Storage      Background Worker (FFmpeg)
      │                                │                                │                                │
      ├── 1. Request Upload URL ──────►│                                │                                │
      │    (POST /videos/upload-url)   ├── 2. Generate Presigned URL    │                                │
      │◄── 3. Return Presigned PUT URL ┼────────────────────────────────┘                                │
      │                                │                                                                 │
      ├── 4. Direct Upload (Raw MP4) ──────────────────────────────────►│                                │
      │                                │                                │                                │
      ├── 5. Confirm Upload Complete ─►│                                │                                │
      │    (POST /videos/{id}/complete)├── 6. Queue TranscodeVideoJob ──────────────────────────────────►│
      │                                │                                │                                ├── 7. Download Original MP4
      │                                │                                │                                ├── 8. Transcode HLS Variants
      │                                │                                │                                ├── 9. Generate Thumbnails
      │                                │                                │◄── 10. Upload HLS & Thumbnails ┼── 11. Extract Metadata
      │                                │◄── 12. Mark Video Status READY ┼────────────────────────────────┘
```

---

# Video State Machine Lifecycle

Every uploaded video transitions through an audited state machine:

```text
UPLOADING ──(Upload Completed)──> UPLOADED ──> QUEUED ──> PROCESSING ──> READY
                                                              │             │
                                                              ▼             ▼
                                                           FAILED        ARCHIVED
```

- **`UPLOADING`:** Presigned URL issued; waiting for browser binary upload.
- **`UPLOADED`:** Client confirmed upload completion; binary verified in object storage.
- **`QUEUED`:** `TranscodeVideoJob` placed in job queue (`jobs` table).
- **`PROCESSING`:** Worker process (`apps/worker`) currently executing FFmpeg transcoding.
- **`READY`:** HLS manifests, `.ts` segments, and poster thumbnails generated; ready for streaming.
- **`FAILED`:** FFmpeg transcoding failed; eligible for manual or automated retry.

---

# 1. Video Entity Schema (`videos`)

### Table Schema: `videos`

```sql
CREATE TABLE videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  status           VARCHAR(50) NOT NULL DEFAULT 'UPLOADING', -- UPLOADING, UPLOADED, QUEUED, PROCESSING, READY, FAILED, ARCHIVED
  duration_seconds INTEGER DEFAULT 0,
  asset_id         UUID, -- References video_assets entity
  
  -- Audit Columns
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
```

---

# 2. Video Asset Model (`video_assets`)

Stores physical paths, quality resolutions, and extracted technical metadata.

### Table Schema: `video_assets`

```sql
CREATE TABLE video_assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  video_id             UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  storage_provider     VARCHAR(50) NOT NULL DEFAULT 'R2',
  bucket               VARCHAR(255) NOT NULL,
  original_path        VARCHAR(500) NOT NULL, -- videos/{videoId}/original/video.mp4
  master_playlist_path VARCHAR(500),          -- videos/{videoId}/hls/master.m3u8
  thumbnail_path       VARCHAR(500),          -- videos/{videoId}/thumbnails/poster.jpg
  preview_path         VARCHAR(500),          -- videos/{videoId}/previews/preview.jpg
  metadata_json        JSONB DEFAULT '{}'::jsonb,
  
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# HLS Output Directory Structure

Worker processes output standard HLS playlists and transport stream segments:

```text
videos/
└── {videoId}/
    ├── original/
    │   └── video.mp4
    ├── hls/
    │   ├── master.m3u8
    │   ├── 1080p/
    │   │   ├── index.m3u8
    │   │   └── seg-001.ts
    │   ├── 720p/
    │   │   ├── index.m3u8
    │   │   └── seg-001.ts
    │   ├── 480p/
    │   │   ├── index.m3u8
    │   │   └── seg-001.ts
    │   └── 360p/
    │       ├── index.m3u8
    │       └── seg-001.ts
    ├── thumbnails/
    │   └── poster.jpg
    └── previews/
        └── preview.gif
```

---

# Transcoding & Metadata Extraction Specifications

FFmpeg executes multi-pass encoding generating 4 resolution profiles:

| Profile | Resolution | Bitrate Target | Audio Codec | Video Codec |
| :--- | :--- | :--- | :--- | :--- |
| **1080p** | $1920 \times 1080$ | 4500 kbps | AAC-LC (128k) | H.264 (AVC) |
| **720p** | $1280 \times 720$ | 2500 kbps | AAC-LC (128k) | H.264 (AVC) |
| **480p** | $854 \times 480$ | 1200 kbps | AAC-LC (96k) | H.264 (AVC) |
| **360p** | $640 \times 360$ | 800 kbps | AAC-LC (64k) | H.264 (AVC) |

### Extracted Metadata JSON (`metadata_json`)
```json
{
  "durationSeconds": 1420,
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "codec": "h264",
  "bitrate": 4850000,
  "fileSizeBytes": 861200000,
  "hasAudio": true
}
```

---

# Original Asset Preservation Strategy

> [!IMPORTANT]
> ### Why Retain Original Master Uploads?
> Rather than deleting the original raw `.mp4` file after generating HLS variants, EOS preserves original master files permanently in Cloudflare R2 storage.
> **Benefits:**
> - **Future Codec Adoption:** Re-transcode into modern formats (AV1, HEVC/H.265) without asking instructors to re-upload.
> - **AI Transcription & Captions:** Provide raw audio streams to Whisper AI models for automatic subtitle generation (`.vtt`).
> - **New Resolution Profiles:** Easily generate 4K or 2K profiles in future system upgrades.

---

# Playback Delivery via Cloudflare CDN

1. Video player (`video.js`, `hls.js`, or native iOS AVPlayer) requests `master.m3u8`.
2. Cloudflare CDN serves cached HLS playlists and `.ts` video segment chunks with zero egress costs.
3. Player automatically evaluates network bandwidth and dynamically switches stream quality between 360p and 1080p.

---

# Recommended Indexes

```sql
-- Video Indexes
CREATE INDEX idx_videos_tenant_org ON videos(tenant_id, organization_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_video_assets_video_id ON video_assets(video_id);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-035: Cloudflare R2 Storage Provider

### Status
**Accepted**

### Context
High-volume video streaming generates massive egress bandwidth costs on standard cloud providers (AWS S3).

### Decision
Use Cloudflare R2 object storage behind the `StorageProvider` abstraction.

### Benefits
- Zero egress bandwidth fees.
- S3-compatible API.
- Global CDN integration.

---

## ADR-036: HTTP Live Streaming (HLS) Standard

### Status
**Accepted**

### Context
Progressive MP4 downloads waste bandwidth and buffer poorly on slow mobile networks.

### Decision
Transcode all uploaded videos into HLS multi-resolution variant manifests (`master.m3u8`).

### Benefits
- Smooth adaptive bitrate playback across web and mobile.
- Fast seeking and low latency.

---

## ADR-037: Video Asset Domain Abstraction

### Status
**Accepted**

### Context
A single video involves multiple generated files (HLS variants, master playlists, poster thumbnails, subtitles).

### Decision
Encapsulate all generated files within a unified `VideoAsset` entity.

### Benefits
- Clean domain abstraction.
- Easy addition of subtitles and preview thumbnails.

---

## ADR-038: Original Video Preservation

### Status
**Accepted**

### Context
Object storage costs are significantly lower than the operational cost of requesting users to re-upload lost source media.

### Decision
Retain raw original uploaded MP4 files indefinitely.

### Benefits
- Enables future AI audio transcription, automated chapter generation, and re-transcoding.

---

# Guiding Principle

> **Videos are immutable assets managed through a Video Asset abstraction. Clients upload directly to object storage, background workers asynchronously generate adaptive HLS streams and related assets, and the platform serves all content through a CDN. This architecture minimizes API load, scales efficiently, and provides a strong foundation for future capabilities such as subtitles, AI transcription, DRM, and advanced video analytics.**

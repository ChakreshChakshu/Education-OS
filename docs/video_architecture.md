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
Browser Client                    Fastify API              Neon DB (Outbox)          Cloudflare R2 Storage         Worker (FFmpeg)
      │                                │                          │                            │                         │
      ├── 1. Request Presigned URL ───►│                          │                            │                         │
      │    (POST /media/presign)       ├── 2. Generate R2 PUT URL │                            │                         │
      │◄── 3. Presigned Upload URL ────┼──────────────────────────┼────────────────────────────┘                         │
      │                                │                          │                                                      │
      ├── 4. Direct Upload (Raw MP4) ─────────────────────────────────────────────────────────►│                         │
      │                                │                          │                            │                         │
      ├── 5. Confirm Upload Complete ─►│                          │                            │                         │
      │    (POST /media/confirm)       ├── 6. Emit Outbox Event ─►│                            │                         │
      │                                │      (MediaUploaded)     │                            │                         │
      │◄── 7. Confirmation (ENCODING) ─┘                          │                            │                         │
      │                                                           ├── 8. Poll Outbox (2s) ──────────────────────────────►│
      │                                                           │                                                      ├── 9. Download MP4
      │                                                           │                            │◄── 10. Fetch Raw MP4 ───┤
      │                                                           │                            │                         ├── 11. Transcode Variants
      │                                                           │                            │                         │   (360p, 720p, 1080p)
      │                                                           │                            │                         ├── 12. Write master.m3u8
      │                                                           │                            │                         ├── 13. Extract Poster
      │                                                           │                            │◄── 14. Sync HLS Stream ─┤
      │                                                           │◄── 15. Update Status READY ┼─────────────────────────┤
      │                                                           │    (media_assets & lesson_modules content_url)       │
```

---

# Video State Machine Lifecycle

Every uploaded video transitions through an audited state machine:

```text
UPLOADING ──(Upload Completed)──> UPLOADED ──> ENCODING ──> PROCESSING ──> READY
                                                                │             │
                                                                ▼             ▼
                                                             FAILED        ARCHIVED
```

- **`UPLOADING`:** Presigned URL issued; waiting for browser binary upload to Cloudflare R2.
- **`UPLOADED`:** Client confirmed upload completion (`POST /api/v1/internal/media/confirm`).
- **`ENCODING` / `QUEUED`:** `MediaUploaded` event written to transactional `outbox_events` and queued for transcoding.
- **`PROCESSING`:** Worker process (`apps/worker`) currently executing FFmpeg multi-bitrate HLS encoding.
- **`READY`:** HLS manifests (`master.m3u8`), `.ts` segments (360p, 720p, 1080p), and poster thumbnails uploaded to Cloudflare R2; `lesson_modules.content_url` and `media_assets.status = 'READY'` updated.
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

---

# HLS Streaming Delivery: Development vs Production Architecture

HLS video delivery differs fundamentally between local development and global production:

```text
DEVELOPMENT (Local):
[Browser: http://localhost:3000]
       │
       ▼ (GET master.m3u8, 360p/index.m3u8, *.ts)
[Fastify API Media Proxy: http://localhost:3001/uploads/hls/:id/*]
       │
       ├── File on disk? ──► Streams immediately with CORS (Access-Control-Allow-Origin: *)
       │
       └── Not on disk? ──► Fetches from Cloudflare R2, caches to disk, streams to client

────────────────────────────────────────────────────────────────────────────────────────────

PRODUCTION (Cloudflare CDN):
[Student Browser]
       │
       ▼ (GET master.m3u8, 360p/index.m3u8, *.ts)
[Cloudflare CDN Edge: https://media.yourdomain.com/hls/:id/*]
       │
       ├── Cache Hit (98%+)? ──► Serves from Edge PoP (<15ms latency, zero API load)
       │
       └── Cache Miss? ──► Fetches from Cloudflare R2 Bucket (Zero Egress Bandwidth Fees)
```

### Why S3 Presigned URLs Fail for HLS Playlists

Standard AWS S3 / Cloudflare R2 presigned URLs (`?X-Amz-Algorithm=...&X-Amz-Signature=...`) are designed for single-file downloads (e.g. raw MP4, PDF), **not** hierarchical streaming playlists:

1. **Missing CORS on S3 API Endpoints:** R2's direct S3 API (`https://<account>.r2.cloudflarestorage.com`) does not emit `Access-Control-Allow-Origin` by default, causing browser `XMLHttpRequest` in `hls.js` to fail with status `0` (`manifestLoadError`).
2. **Broken Relative URI Resolution:** An HLS playlist references child variant playlists (`360p/index.m3u8`) and segmented chunks (`segment_000.ts`) via relative paths. When `hls.js` requests child segments, the browser resolves them against the base URL path without carrying over the query string credentials, resulting in `403 Forbidden` errors on private buckets.

---

### Development Mode Implementation

To enable friction-free local development without requiring public domains or cloud CORS modifications:

1. **Fastify API Streaming Route (`/uploads/*`):**
   - Implemented in `apps/api/src/index.js`.
   - Attaches explicit CORS headers (`Access-Control-Allow-Origin: *`, `GET, HEAD, OPTIONS`).
   - Serves local HLS directories generated by the worker transcoder (`apps/api/uploads/hls/<id>/`).
   - If an asset is not yet on local disk, it transparently downloads the chunk from Cloudflare R2 via `StorageProvider.download()`, writes it to local disk as a cache, and streams it back.
2. **Client Stream Normalizer (`HlsVideoPlayer.jsx`):**
   - Automatically detects private R2 S3 endpoints (`.r2.cloudflarestorage.com/hls/<id>/master.m3u8`) and rewrites them to the local API streaming endpoint (`http://localhost:3001/uploads/hls/<id>/master.m3u8`).
   - Features automatic recovery on fatal network errors.
3. **Worker Transcode Processor (`apps/worker/src/processors/index.js`):**
   - In dev mode (when `MEDIA_CDN_URL` is unset), persists the local streaming URL (`http://localhost:3001/uploads/hls/<id>/master.m3u8`) to `media_assets` and `lesson_modules`.

---

### Production Deployment Blueprint (Cloudflare R2 + CDN)

For production, follow these steps to achieve high-performance, cost-free egress streaming:

#### Step 1: Connect a Custom Domain to the R2 Bucket
1. Open **Cloudflare Dashboard** &rarr; **R2** &rarr; select the `education-os-media` bucket.
2. Navigate to **Settings** &rarr; **Public Access**.
3. Under **Custom Domains**, click **Connect Domain** (e.g., `media.yourdomain.com`).
   *(Alternatively, enable the free **R2.dev Subdomain** for staging).*

#### Step 2: Configure CORS on the R2 Bucket
In the bucket settings under **CORS Policy**, add:
```json
[
  {
    "AllowedOrigins": [
      "https://app.yourdomain.com",
      "https://yourdomain.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

#### Step 3: Configure Environment Variables
Set the public CDN base URL in the production environment:
```bash
# apps/api & apps/worker .env
MEDIA_CDN_URL=https://media.yourdomain.com
```
When configured, the worker transcoder automatically persists public CDN URLs (`https://media.yourdomain.com/hls/<id>/master.m3u8`), allowing global edge caching without loading the API servers.

#### Step 4 (Optional Enterprise Tier): Edge Token Verification & DRM
For private or paywalled courseware:
- Deploy a lightweight **Cloudflare Worker** on the `media.yourdomain.com/*` route.
- The Edge Worker validates a signed cookie or JWT before returning `.ts` video chunks, preventing unauthorized video hotlinking while preserving edge caching.


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

# Media & File Storage Bounded Context (`@eos/domain-media`)

Governs video upload pipelines, HLS multi-bitrate transcoding jobs, object storage abstractions, and platform file metadata.

## Domain Entities & Aggregates
- **MediaAsset:** Standardized media abstraction.
- **Video & VideoVariant:** Original master video files and adaptive HLS variants (1080p, 720p, 480p, 360p).
- **FileAsset:** Physical storage object metadata (`file_assets`).

## Layers
- `domain/`: Entities, Value Objects, Domain Events, Repository Interfaces.
- `application/`: Application Use Cases (e.g. `UploadVideo`, `ProcessHLSJob`, `GeneratePresignedUrl`).
- `infrastructure/`: StorageProvider & FFmpeg Adapters.
- `presentation/`: Fastify Controller Endpoints & Validation Schemas.

# 14 – Deployment & DevOps

## Purpose

This document defines the deployment and DevOps architecture for the Education Operating System (EOS).

It establishes a containerized, VPS-friendly production setup using Docker Compose, Nginx, Cloudflare Edge, and automated GitHub Actions CI/CD. It guarantees immutable releases, zero-downtime rolling upgrades, automated offsite database backups, and rapid disaster recovery.

---

# Core Design Principles

- **Infrastructure as Code (IaC):** Declarative Docker Compose service topology (`docker-compose.yml`).
- **Immutable Container Releases:** Version-tagged Docker images built and published via automated CI/CD.
- **Zero Manual Server Mutations:** All server upgrades deployed automatically via GitHub Actions pipelines.
- **Environment Isolation:** Complete decoupling of `.env.development`, `.env.staging`, and `.env.production`.
- **Security Hardened by Default:** HTTPS-only, non-root Docker containers, UFW firewall, Fail2Ban, and SSH key authentication.
- **Automated Offsite Backups:** Encrypted nightly database dumps uploaded to Cloudflare R2 object storage.

---

# Production Deployment Topology

```text
                                Internet Traffic
                                       │
                                       ▼
                       Cloudflare CDN / DNS / DDoS Edge
                                       │
                                       ▼
                       Nginx Reverse Proxy (Host / Port 443)
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
   Fastify API Container         Worker Container            Grafana Container
   (apps/api:v1.0.0)             (apps/worker:v1.0.0)        (Port 3000)
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       ▼
                            PostgreSQL DB Container
                            (Docker Volume: pgdata)

Prometheus scrapes metrics continuously from API, Worker, PostgreSQL, and Nginx.
```

---

# Container Service Architecture

### Primary Production Stack
- **`api`:** Fastify Node.js HTTP Application Server (`apps/api`).
- **`worker`:** Background Job Processing & Outbox Worker (`apps/worker`).
- **`postgres`:** PostgreSQL 16 relational database with persistent Docker volume (`pgdata`).
- **`nginx`:** High-performance TLS termination, reverse proxy, and static file server.
- **`prometheus`:** Time-series metrics collection server.
- **`grafana`:** Metrics visualization dashboard.

### Local Development Auxiliary Stack
- **`mailpit`:** Local SMTP mock server for email testing (`http://localhost:8025`).
- **`adminer`:** Lightweight Web DB GUI (`http://localhost:8080`).
- **`minio`:** Local S3-compatible object storage emulator.

---

# Reverse Proxy Configuration (Nginx)

Nginx handles edge concerns, leaving Fastify to process pure application logic:

```nginx
server {
    listen 443 ssl http2;
    server_name api.skillyards.com;

    ssl_certificate /etc/letsencrypt/live/api.skillyards.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.skillyards.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    # Gzip & Brotli Compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # Maximum Payload Limit (1GB for Direct Upload Metadata)
    client_max_body_size 10M;

    location / {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

# CI/CD Pipeline Protocol (GitHub Actions)

```text
Git Push (main branch)
       │
       ▼
1. Install Monorepo Dependencies (pnpm install)
       │
       ▼
2. Static Analysis & Linting (pnpm lint && dependency-cruiser)
       │
       ▼
3. Run Unit & Integration Tests (pnpm test)
       │
       ▼
4. Build Production Artifacts (pnpm build)
       │
       ▼
5. Build & Push Docker Images to Registry (ghcr.io/eos/api:sha-xyz)
       │
       ▼
6. Deploy to Production VPS via SSH Commands
       ├── Pull latest container images (docker compose pull)
       ├── Run database migrations (pnpm db:migrate)
       ├── Rolling container update (docker compose up -d)
       └── Verify health probe GET /health/ready
```

---

# Offsite Database Backup Script

Nightly backup worker compresses, encrypts, and uploads PostgreSQL dumps to Cloudflare R2:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/eos_db_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="/tmp/eos_db_${TIMESTAMP}.sql.gz.enc"

# 1. Export & Compress PostgreSQL Database
docker exec -t eos_postgres pg_dump -U eos_user -d eos_production | gzip -9 > "$BACKUP_FILE"

# 2. AES-256 Symmetric Encryption
openssl enc -aes-256-cbc -salt -pbkdf2 -in "$BACKUP_FILE" -out "$ENCRYPTED_FILE" -k "$BACKUP_PASSPHRASE"

# 3. Upload to Cloudflare R2 Offsite Bucket via AWS CLI / Rclone
aws s3 cp "$ENCRYPTED_FILE" "s3://eos-backups-bucket/db/${TIMESTAMP}.sql.gz.enc" --endpoint-url "$R2_ENDPOINT"

# 4. Clean Temporary Local Backup Files
rm -f "$BACKUP_FILE" "$ENCRYPTED_FILE"
```

### Retention Schedule
- **Daily Backups:** Retained for 30 days.
- **Weekly Backups:** Retained for 12 weeks.
- **Monthly Backups:** Retained indefinitely.

---

# Disaster Recovery Plan (DRP)

In the event of complete VPS loss:
1. Provision new Ubuntu LTS VPS instance.
2. Clone repository & inject production secrets (`.env.production`).
3. Run `docker compose up -d postgres`.
4. Download latest encrypted backup from Cloudflare R2, decrypt via `openssl`, and restore:
   ```bash
   gunzip -c eos_db_backup.sql | docker exec -i eos_postgres psql -U eos_user -d eos_production
   ```
5. Deploy API, Worker, and Nginx containers (`docker compose up -d`).
6. Point Cloudflare DNS to new VPS IP address (Downtime $< 15\text{ minutes}$).

---

# Architectural Decision Records (ADRs)

---

## ADR-051: Containerized Deployment via Docker Compose

### Status
**Accepted**

### Context
Manual VPS software setup creates subtle configuration drift between development and production.

### Decision
Package all services as Docker containers orchestrated by Docker Compose.

### Benefits
- 100% reproducible environments across local dev, staging, and production.
- Simple single-command deployments and scaling.

---

## ADR-052: Automated GitHub Actions CI/CD

### Status
**Accepted**

### Context
Manual SSH deployments risk human error and missed test executions.

### Decision
Automate all linting, testing, image building, and deployment via GitHub Actions.

### Benefits
- Guaranteed test suite execution before production code updates.
- Fast, repeatable release cycles with automated rollback.

---

## ADR-053: Nginx Reverse Proxy & TLS Termination

### Status
**Accepted**

### Context
Fastify application processes should focus exclusively on API business logic rather than TLS management, compression, or static assets.

### Decision
Position Nginx in front of Node.js container services.

### Benefits
- High-performance TLS termination and Gzip/Brotli compression.
- Centralized rate-limiting and security header enforcement.

---

## ADR-054: Cloudflare Edge Integration

### Status
**Accepted**

### Context
Protecting production origin servers against DDoS attacks while caching static assets globally.

### Decision
Proxy incoming DNS traffic through Cloudflare CDN/WAF.

### Benefits
- Free DDoS mitigation and global edge caching.
- Zero egress bandwidth fees for Cloudflare R2 storage integration.

---

# Guiding Principle

> **EOS is deployed as a containerized platform using Docker Compose on a VPS, with Cloudflare at the edge, Nginx as the reverse proxy, Fastify for application services, and GitHub Actions providing automated CI/CD. Every deployment is immutable, reproducible, observable, and easily recoverable, ensuring reliable operations today while providing a clear path to future horizontal scaling and orchestration platforms such as Kubernetes.**

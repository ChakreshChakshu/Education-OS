# 13 – Observability

## Purpose

This document defines the observability strategy for the Education Operating System (EOS).

It establishes an end-to-end telemetry architecture combining structured JSON logging (Pino), Prometheus metrics, OpenTelemetry distributed tracing, Grafana dashboard visualization, health monitoring, and immutable compliance audit logs.

---

# Core Design Principles

- **Structured JSON Logs:** All log events emitted as parseable JSON via `@eos/infra-logger` (Pino).
- **End-to-End Request Correlation:** Unified `X-Request-Id` header propagated across Fastify HTTP routes, DB transactions, worker jobs, and log statements.
- **Vendor-Neutral Tracing:** OpenTelemetry instrumentation for distributed span tracing across modules and services.
- **Self-Hosted Metrics:** Prometheus metrics exporter paired with pre-configured Grafana dashboards.
- **Health-First Monitoring:** Three-tier health checks (`/health`, `/health/live`, `/health/ready`).
- **Immutable Audit Logging:** Relational persistence of critical security and administrative actions (`audit_logs`).
- **Zero Sensitive Data Exposure:** Automatic sanitization masking PII, passwords, JWTs, and API credentials.

---

# High-Level Architecture

```text
                               Client Request (X-Request-Id)
                                             │
                                             ▼
                                     Fastify API Gateway
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
     Structured JSON Logs            Prometheus Metrics           OpenTelemetry Traces
      (Pino Logger Adapter)          (/metrics Exporter)          (Context Propagation)
               │                             │                             │
               ▼                             ▼                             ▼
        Log Aggregator               Prometheus TSDB               OpenTelemetry Collector
        (Loki / File)                        │                             │
               │                             ▼                             ▼
               └────────────────────► Grafana Dashboards ◄─────────────────┘
```

---

# Request Correlation Protocol (`request_id`)

Every incoming HTTP request or queued background job receives or inherits a unique `request_id` (UUID v7):

```text
HTTP Request (Header: X-Request-Id) ──> Fastify Handler ──> DB Transaction ──> Outbox Event ──> Worker Job
```

All log statements, metric counters, and OpenTelemetry spans include the exact same `request_id` context.

---

# 1. Structured JSON Logging Format

```json
{
  "timestamp": "2026-08-31T17:45:21.102Z",
  "level": "INFO",
  "requestId": "01917f8a-9c42-7a1b-8c4d-123456789abc",
  "tenantId": "01917f8b-1122-7334-9aa1-fedcba987654",
  "organizationId": "01917f8c-3344-7556-8bb2-abcdef123456",
  "userId": "01917f8d-4455-7778-9cc3-112233445566",
  "module": "academics",
  "action": "course.publish",
  "durationMs": 42.5,
  "statusCode": 200,
  "message": "Course published successfully"
}
```

### Log Levels
- **`TRACE`:** Raw internal debugging details (development environment only).
- **`DEBUG`:** Diagnostic information for troubleshooting.
- **`INFO`:** Standard operational business milestones.
- **`WARN`:** Recoverable exceptions (e.g. rate-limit warning, transient storage retry).
- **`ERROR`:** Failed requests or unhandled API exceptions.
- **`FATAL`:** Critical failures causing process shutdown.

---

# 2. Metrics Architecture (Prometheus)

Exposed on `/metrics` (authenticated/internal route).

### Infrastructure Metrics
- `http_requests_total{method, route, status}`
- `http_request_duration_seconds{method, route, status}` (Histograms for P50, P95, P99)
- `db_query_duration_seconds{query_type, table}`
- `jobs_in_queue_count{queue_name, status}`
- `job_processing_seconds{job_name, status}`

### Business Domain KPIs
- `eos_courses_published_total`
- `eos_lessons_completed_total`
- `eos_enrollments_created_total`
- `eos_certificates_issued_total`
- `eos_videos_uploaded_total`

---

# 3. Health Check Architecture

| Endpoint | Type | Purpose | Dependencies Checked |
| :--- | :--- | :--- | :--- |
| **`GET /health`** | General Health | Basic system status summary. | API process check. |
| **`GET /health/live`** | Liveness Probe | Verifies container is running. | Zero external checks (returns 200 OK). |
| **`GET /health/ready`** | Readiness Probe | Verifies ability to serve traffic. | PostgreSQL DB, R2 Storage, Queue Worker. |

---

# 4. Immutable Audit Schema (`audit_logs`)

Tracks administrative and security-critical actions for enterprise compliance.

### Table Schema: `audit_logs`

```sql
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL, -- user.login, role.assign, course.publish, file.delete
  entity_type     VARCHAR(100) NOT NULL, -- User, Course, RoleAssignment, FileAsset
  entity_id       UUID NOT NULL,
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  metadata_json   JSONB DEFAULT '{}'::jsonb, -- Old vs. new values diff
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# SLA Performance Targets & Log Retention

### Performance Target Matrix

| Metric | Target SLA |
| :--- | :--- |
| **API Response (P95)** | $< 300\text{ ms}$ |
| **Health Readiness Check** | $< 100\text{ ms}$ |
| **Authentication Processing** | $< 150\text{ ms}$ |
| **Database Query (P95)** | $< 100\text{ ms}$ |
| **Queue Dispatch** | $< 1.0\text{ s}$ |
| **Notification Delivery** | $< 60\text{ s}$ |

### Retention Schedule
- **Application JSON Logs:** 30 Days
- **Prometheus Metrics TSDB:** 90 Days
- **Audit Logs (`audit_logs`):** 365 Days Minimum (Encrypted Backups)

---

# Recommended Indexes

```sql
-- Audit Log Indexes
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-047: Structured JSON Logging (Pino)

### Status
**Accepted**

### Context
Unstructured text log strings are difficult to parse, search, and ingest into log aggregation tools.

### Decision
Emit all application logs in structured JSON format using Pino via `@eos/infra-logger`.

### Benefits
- Instant integration with Grafana Loki, Datadog, or Elasticsearch.
- Fast string serialization performance.

---

## ADR-048: OpenTelemetry Tracing Standard

### Status
**Accepted**

### Context
Tracing requests across Fastify APIs, PostgreSQL transactions, and asynchronous workers requires a vendor-neutral standard.

### Decision
Instrument code with OpenTelemetry APIs for span generation and context propagation.

### Benefits
- Vendor-agnostic distributed tracing.
- Zero lock-in to commercial APM vendors.

---

## ADR-049: Prometheus & Grafana Monitoring

### Status
**Accepted**

### Context
EOS requires self-hosted, operational monitoring capable of running efficiently on VPS or Cloud infrastructure.

### Decision
Use Prometheus for time-series metrics collection and Grafana for dashboard visualization.

### Benefits
- Battle-tested open-source ecosystem.
- Lightweight metrics scraper.

---

## ADR-050: End-to-End Request Correlation (`request_id`)

### Status
**Accepted**

### Context
Debugging issues that cross API handlers, database queries, outbox events, and worker jobs is difficult without correlation tokens.

### Decision
Generate an immutable `request_id` (UUID v7) at API ingress and attach it to all logs, traces, and worker jobs.

### Benefits
- Instant end-to-end debugging across system boundaries.
- Simplified incident root-cause analysis.

---

# Guiding Principle

> **Every request, job, and business event should be observable from end to end. Logs, metrics, traces, and audit records work together through a shared Request ID to provide complete visibility into system behavior, enabling rapid debugging, reliable operations, and informed capacity planning without coupling the application to any specific monitoring vendor.**

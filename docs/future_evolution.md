# 16 – Future Evolution

## Purpose

This document defines the long-term strategic evolution roadmap for the Education Operating System (EOS).

It establishes how the platform starts as a high-velocity **Modular Monolith** and evolves incrementally—driven by operational evidence rather than premature complexity—into a distributed platform supporting enterprise ERP integrations, AI automation, third-party plugin ecosystems, and multi-region cloud deployments.

---

# Core Evolution Principles

- **Modular Monolith First:** Maintain unified deployment velocity and low operational cost until evidence demands service extraction.
- **Evidence-Based Extraction:** Extract independent microservices only when justified by scaling bottlenecks, team ownership boundaries, or deployment cadence differences.
- **Domain-Driven Boundaries:** Clean Architecture boundaries inside `packages/domains/` guarantee zero business logic rewrites during extraction.
- **Provider Abstraction Protection:** Swap underlying infrastructure drivers (PostgreSQL Queue $\rightarrow$ AWS SQS, R2 $\rightarrow$ S3) without changing domain code.
- **Isolated AI Integration:** AI capabilities run as independent modules behind `AIProvider` abstractions.
- **Extensible Plugin Ecosystem:** Extension points exposed via interfaces and domain events without mutating core domain code.

---

# Four-Phase Evolution Roadmap

```text
  Phase 1: MVP                   Phase 2: Growth               Phase 3: Enterprise           Phase 4: Extraction
┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│ - Modular Monolith   │       │ - Public API (/v1)   │       │ - ERP/HRMS Adapters  │       │ - Decoupled Micro-   │
│ - Fastify + Drizzle  │  ───► │ - Mobile App APIs    │  ───► │ - Enterprise SSO     │  ───► │   services (Auth,    │
│ - PostgreSQL DB      │       │ - Webhooks Engine    │       │ - SOC 2 & FERPA      │       │   Video, Billing)    │
│ - Cloudflare R2      │       │ - Advanced Analytics │       │ - Custom Plugins     │       │ - Kafka / SQS Bus    │
└──────────────────────┘       └──────────────────────┘       └──────────────────────┘       └──────────────────────┘
```

---

# Service Extraction Protocol

When operational metrics demonstrate that a specific bounded context requires independent scaling (e.g. `media` transcoding or `identity` authentication), the module is extracted into a standalone service without changing domain use cases:

```text
Modular Monolith State (Phase 1–3)                     Extracted Service State (Phase 4)

Fastify Modular API Server                              API Gateway Router
├── identity domain                                     ├── Auth Service (Independent DB)
├── academics domain ──(In-Process Event)──►            ├── Academics Service (Independent DB)
└── media domain                                        └── Video Service ──(Kafka Event)──►
```

---

# 1. AI Architecture & Module Integration

AI capabilities are treated as independent, pluggable domain modules communicating via standard application services and domain events:

```text
                     EOS Core Application Layer
                                 │
                                 ▼
                     AI Module (packages/domains/ai)
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
Course Assistant         Quiz & Exam Generator    Whisper Transcript
(LLM Recommendations)    (Automated Assessments)  (Video Captions)
        │                        │                        │
        └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                    AIProvider Abstraction Interface
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
     OpenAI (GPT-4o)     Anthropic (Claude 3.5)  Google Gemini
```

---

# 2. Plugin & Extension Architecture

EOS exposes clean extension contracts for third-party integrations, allowing custom enterprise plugins to register handlers without modifying core platform code:

```text
                               ┌──────────────────────┐
                               │       EOS Core       │
                               └──────────┬───────────┘
                                          │
       ┌──────────────────┬───────────────┼───────────────┬──────────────────┐
       ▼                  ▼               ▼               ▼                  ▼
┌──────────────┐   ┌──────────────┐┌──────────────┐┌──────────────┐   ┌──────────────┐
│  ERP Plugin  │   │Payment Plugin││  AI Plugin   ││  SSO Plugin  │   │  CRM Plugin  │
│(SAP / Odoo)  │   │(Stripe/Razor)││(OpenAI/Gemini││(Okta / SAML) │   │ (Salesforce) │
└──────────────┘   └──────────────┘└──────────────┘└──────────────┘   └──────────────┘
```

---

# 3. Infrastructure Evolution Matrix

| Infrastructure Capability | Phase 1 (MVP) | Phase 2 (Growth) | Phase 3/4 (Enterprise) |
| :--- | :--- | :--- | :--- |
| **Search Engine** | PostgreSQL Full-Text Search | PostgreSQL Full-Text | OpenSearch / Elasticsearch |
| **Message Queue** | PostgreSQL Queue (`jobs` table) | PostgreSQL Queue | AWS SQS / RabbitMQ / Apache Kafka |
| **File Storage** | Cloudflare R2 | Cloudflare R2 | Multi-Region AWS S3 / Azure Blob |
| **Authentication** | Argon2id + Local JWT | OAuth 2.0 / OIDC | Enterprise SAML / Okta / Azure AD |
| **Database** | Single PostgreSQL Instance | Primary + Read Replicas | Multi-Region PostgreSQL Cluster |

---

# Scalability Milestones

| Growth Stage | Institutional Tenants | Concurrent Active Users | Target Infrastructure Configuration |
| :--- | :--- | :--- | :--- |
| **MVP** | $1 - 10$ | $1,000$ | Single VPS ($4\text{ VCPU}, 8\text{GB RAM}$), Docker Compose. |
| **Growth** | $10 - 100$ | $25,000$ | Scaled API Containers, Managed PostgreSQL Read Replica. |
| **Expansion** | $100 - 1,000$ | $250,000$ | Redis Caching, Dedicated Transcoding Worker Cluster. |
| **Enterprise** | $1,000 - 10,000+$ | $2,500,000+$ | Extracted Microservices, Multi-Region Kubernetes (K8s). |

---

# Architectural Decision Records (ADRs)

---

## ADR-059: Modular Monolith First Architecture

### Status
**Accepted**

### Context
Prematurely building microservices on day one introduces distributed tracing, network latency, dual-write consistency, and deployment complexity before domain boundaries solidify.

### Decision
Build EOS as a Clean Architecture Modular Monolith; defer microservice extraction until operational evidence demands it.

### Benefits
- Rapid initial development velocity.
- Simple, low-cost operations.
- Ultra-fast in-process domain events.

---

## ADR-060: Pluggable AI Module Integration

### Status
**Accepted**

### Context
AI LLM vendors (OpenAI, Anthropic, Google) evolve rapidly with changing pricing models and rate limits.

### Decision
Isolate all AI features inside `packages/domains/ai` operating behind an `AIProvider` contract.

### Benefits
- Seamless switching between OpenAI, Anthropic, or Google Gemini.
- Zero risk of AI provider lock-in disrupting core LMS functionality.

---

## ADR-061: Event-Driven Plugin Architecture

### Status
**Accepted**

### Context
Enterprise customers require custom integrations (SAP ERP, state government portals) that must not clutter the core product codebase.

### Decision
Expose clean plugin extension points via domain events, public APIs, and provider interfaces.

### Benefits
- Stable core codebase.
- Custom enterprise connectors built as isolated plugin packages.

---

## ADR-062: Evolution Driven by Operational Evidence

### Status
**Accepted**

### Context
Adopting new technologies or microservices based on industry hype increases maintenance burden without business ROI.

### Decision
Migrate infrastructure components (e.g. PostgreSQL Queue $\rightarrow$ Kafka) only when supported by operational telemetry (CPU/Memory metrics, queue latency, team ownership needs).

### Benefits
- Controls operational costs.
- Prevents premature optimization.

---

# Guiding Principle

> **EOS is designed to evolve through incremental, evidence-based decisions. The platform begins as a well-structured Modular Monolith with strong architectural boundaries, provider abstractions, and event-driven communication. As business and technical demands grow, individual capabilities can be extracted into independent services, new AI capabilities can be introduced as isolated modules, and external systems can integrate through plugins and public APIs—all without disrupting the core domain model or requiring large-scale rewrites.**

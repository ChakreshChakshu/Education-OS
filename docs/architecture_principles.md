# 02 - Architecture Principles

## Purpose

This document defines the architectural principles that govern the Education Operating System (EOS).

Every module, feature, and infrastructure component **must** adhere to these principles.

The primary goals are:

- **Maintainability**
- **Scalability**
- **Testability**
- **Extensibility**
- **Provider Independence**
- **Cloud Independence**
- **Long-term Evolution**

---

# 1. Architecture Style

EOS follows a **Modular Monolith** architecture.

Each business capability is implemented as an independent module with well-defined boundaries.

Modules are designed to be **extractable into standalone services** in the future without requiring major rewrites.

> [!NOTE]
> Microservices are **not** a current objective. A modular monolith provides maximum developer velocity with zero network overhead today while keeping extraction pathways open for tomorrow.

---

# 2. Architectural Patterns

The platform adopts the following core architectural patterns:

- **Domain-Driven Design (DDD):** Ubiquitous language, bounded contexts, entities, aggregates, and domain events.
- **Clean Architecture:** Strict separation of business rules from frameworks and infrastructure.
- **SOLID Principles:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **Dependency Inversion Principle:** Business layers depend on abstractions; infrastructure implements abstractions.
- **Provider Abstraction Pattern:** Universal wrappers over external services (storage, queue, mail, auth, cache).
- **Repository Pattern:** Abstraction over data storage and retrieval.
- **Factory Pattern:** Encapsulating complex object creation logic.
- **Strategy Pattern:** Interchangeable provider implementations (e.g., `InMemoryCacheProvider` vs. `RedisCacheProvider`).

---

# 3. Layered Architecture

Every module follows the exact same four-layer structure.

```text
Presentation Layer
        ↓
Application Layer
        ↓
   Domain Layer
        ↑
Infrastructure Layer
```

### Layer Responsibilities

| Layer | Responsibilities | Constraints |
| :--- | :--- | :--- |
| **Presentation** | HTTP Controllers, validation, serialization, transport-specific concerns | Must **never** contain business logic. |
| **Application** | Use Cases, Commands, Queries, Orchestration, Transactions | Contains application-specific business workflows. |
| **Domain** | Entities, Aggregate Roots, Value Objects, Domain Services, Domain Events, Repository Interfaces | Represents core enterprise business. Must **not** depend on frameworks or infrastructure. |
| **Infrastructure** | Database, Storage, Queue, Mail, Auth, External APIs | Implements interfaces defined by Domain/Application layers. |

---

# 4. Dependency Rules

### Allowed Dependency Flow

```text
Presentation Layer (Fastify Route Plugins / Plain Controllers)
        ↓
Application Layer (Use Cases / Command Handlers)
        ↓
   Domain Layer (Entities / Aggregate Roots / Value Objects / Interfaces)
        ↑
Infrastructure Layer (Concrete Database Repositories / External Providers)
```

> [!CAUTION]
> ### Forbidden Imports
> - ❌ `Domain` → `Infrastructure`
> - ❌ `Domain` → `Presentation`
> - ❌ `Application` → `Presentation`
> - ❌ Circular dependencies between modules
> - ❌ Cross-module direct infrastructure access

---

# 5. Module Boundaries

Each module owns its own:
- Business rules
- Entities & Aggregates
- Repositories
- Application Use Cases

Modules expose **only** their public application interface. Internal implementation details must remain private.

> [!WARNING]
> Modules must **never** access another module's database tables or internal schema directly.

---

# 6. Module Communication

Two communication channels are allowed between modules:

### 1. Synchronous Communication
Executed via another module's published public **Application API** within the same database transaction.

```text
Course Module  ──(calls public API)──>  Enrollment Module API
```

### 2. Asynchronous Communication
Executed via **Domain Events** for side-effects and cross-domain triggers.

- **Initially:** In-process event dispatcher.
- **Future:** External message brokers (Amazon SQS, RabbitMQ, or Kafka if justified).

> [!TIP]
> Side-effects outside the immediate core aggregate boundary should be handled asynchronously whenever possible.

---

# 7. Provider Abstractions

Every external dependency must be encapsulated behind an abstract provider class or interface.

### Required Core Providers
- `StorageProvider` (e.g. `LocalStorageProvider`, `R2StorageProvider`, `S3StorageProvider`)
- `QueueProvider` (e.g. `PostgresQueueProvider`, `SqsQueueProvider`)
- `MailProvider` (e.g. `ConsoleMailProvider`, `SesMailProvider`)
- `CacheProvider` (e.g. `InMemoryCacheProvider`, `RedisCacheProvider`)
- `AuthProvider` (e.g. `JwtAuthProvider`)
- `LoggerProvider` (e.g. `PinoLoggerProvider`)
- `NotificationProvider` (e.g. `PushNotificationProvider`)

> [!IMPORTANT]
> The application layer must **never** import vendor-specific SDKs directly.

---

# 8. Composition Root

Dependency registration occurs in a single centralized location per application:

```text
apps/api/src/bootstrap/
├── container.js     # Lightweight DI container
├── providers.js     # Infrastructure providers registration
└── services.js      # Use cases & repositories registration
```

### Responsibilities
- Register infrastructure providers
- Register concrete database repositories
- Register application use cases
- Resolve dependencies for controllers & route plugins

> [!WARNING]
> Business modules and controllers must **never** instantiate infrastructure classes directly.

---

# 9. Transaction Boundaries

### Project Rule

> **One Use Case = One Database Transaction**

### Guidelines
1. Keep database transactions as short as possible.
2. **Never** make external network calls (HTTP requests, emails, cloud storage calls) inside a database transaction.
3. Publish **Domain Events** only after the database transaction successfully commits.

---

# 10. Error Handling

Business errors must be represented as structured application errors or functional `Result` objects.

### Guidelines
- Do **not** leak internal system exceptions or stack traces to HTTP consumers.
- Return consistent DTO error responses across all API endpoints.
- Log unexpected failures with full diagnostic context via `LoggerProvider`.
- **Fail fast** on invalid request inputs at the presentation boundary.

---

# 11. Validation

Validation occurs at the **Presentation Layer** before reaching use cases.

### Responsibilities
- Validate request structure and parameters.
- Validate payload data types and string formats.
- Validate required fields.

> [!NOTE]
> Presentation validation checks input shape. Core business rules (e.g., duplicate enrollment prevention, prerequisite checks) remain inside Domain/Application logic.

---

# 12. Security Principles

The platform is **secure by default**.

### Core Requirements
1. **Authentication:** Required by default on all routes unless explicitly marked public.
2. **Authorization:** Role-Based Access Control (RBAC) and Tenant Scope checks evaluated on every protected action.
3. **HTTP-Only Cookies:** Secure cookie transport for JWT tokens.
4. **Input Validation:** Strict payload validation on every endpoint.
5. **SQL Injection Prevention:** Parameterized database queries via Drizzle ORM.
6. **Principle of Least Privilege:** Minimal access scopes for database users and cloud IAM roles.
7. **Secret Management:** Secrets stored in environment variables, never in source control.

---

# 13. Event Principles

Domain Events represent immutable business facts that occurred in the past.

### Naming Convention
Named in past tense:
- `UserRegisteredEvent`
- `CoursePublishedEvent`
- `EnrollmentCreatedEvent`
- `AssessmentCompletedEvent`

> [!IMPORTANT]
> Events should contain domain identifiers and facts. They must **never** expose infrastructure objects or HTTP request details.

---

# 14. Naming Conventions

| Component Category | Naming Pattern | Example |
| :--- | :--- | :--- |
| **Entities** | PascalCase noun | `Course`, `User`, `Enrollment` |
| **Use Cases** | Verb + Noun + `UseCase` | `CreateCourseUseCase`, `EnrollStudentUseCase` |
| **Repositories** | Entity + `Repository` | `CourseRepository`, `UserRepository` |
| **Providers** | Capability + `Provider` | `StorageProvider`, `MailProvider` |
| **Domain Events** | Fact in past tense + `Event` | `CoursePublishedEvent`, `UserRegisteredEvent` |

---

# 15. Coding Standards

- **Composition over Inheritance:** Prefer functional composition and object wrapping over deep inheritance trees.
- **Single Responsibility:** Keep functions focused on a single task.
- **Small Classes/Modules:** Keep source files concise and cohesive.
- **Immutability:** Favor immutable data structures and return new objects on mutation.
- **No Global State:** Avoid static global state or mutable singletons outside the DI container.
- **No Static Business Logic:** Avoid static methods for domain logic to maintain testability.
- **Explicit Dependencies:** Pass all dependencies explicitly via constructor functions.

---

# 16. Testing Principles

Every module supports a pyramid of automated testing:

```text
       / E2E Tests \         # API & web end-to-end integration
      / Contract  \        # Public contract verification
     / Integration \       # Database & repository tests
    /  Unit Tests   \      # Isolated domain & use case testing
```

> [!TIP]
> Business logic in Domain and Application layers must be 100% testable in isolation **without** requiring a live HTTP server or database.

---

# 17. Architectural Decision Records (ADR)

Every significant architectural decision requires an Architectural Decision Record (ADR) stored in `docs/adr/`.

### Mandatory Scenarios for ADRs
- Adding or replacing infrastructure providers
- Database schema strategy changes
- Module boundary alterations
- External third-party integrations
- Authentication/Authorization strategy changes
- Deployment strategy updates

### ADR Template
```text
# ADR-[NUMBER]: [TITLE]

## Status
[Proposed | Accepted | Superseded | Rejected]

## Context
Describe the background and problem requiring a decision.

## Decision
State the chosen architectural decision.

## Alternatives Considered
Detail other options evaluated.

## Consequences
- **Pros:** Benefits gained.
- **Cons:** Trade-offs or complexity introduced.

## Migration Strategy
Steps to roll out the change safely.
```

---

# 18. Long-Term Evolution

EOS is built to evolve without requiring architectural rewrites.

### Supported Future Capabilities
- **Independent Service Extraction:** Microservice extraction of high-load domain modules.
- **Mobile Applications:** Headless Fastify REST API seamlessly serves iOS/Android clients.
- **ERP Integrations:** Standardized contracts for enterprise system connectivity.
- **AI Learning Modules:** Pluggable AI processing services.
- **White-Label Deployments:** Multi-tenant domain isolation and custom branding tokens.
- **Multi-Region & Horizontal Scaling:** Stateless Fastify containers scaling behind load balancers.

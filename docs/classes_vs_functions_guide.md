# ES6 Classes vs Functional Programming Architectural Guide

This document explains the architectural rationale, design trade-offs, industry trends, and practical application of **ES6 Classes vs Functional Programming** within the Education Operating System (EOS).

---

## Executive Summary

Modern JavaScript and TypeScript development is **multiparadigm**. The debate is not whether classes or functions are "better," but rather using the appropriate paradigm for specific architectural layers:

```text
Education Operating System Paradigm Allocation Matrix

┌───────────────────────────────────────────────┬──────────────────────────────────────────┐
│ Object-Oriented (ES6 / TypeScript Classes)     │ Functional Programming (Pure Functions)  │
├───────────────────────────────────────────────┼──────────────────────────────────────────┤
│ • Domain Entities & Aggregate Roots           │ • Fastify REST Route Definitions         │
│ • Value Objects (Email, FileSize, CourseCode) │ • Presentation Controllers & DTO Mappers │
│ • Repository Contracts & Concrete Adapters    │ • React & Next.js UI Components & Hooks │
│ • Infrastructure Provider Abstractions        │ • Pure Utility & Data Processing Pipelines│
└───────────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 1. Why We Use ES6 Classes in Domain & Core Layers

### 1.1 Encapsulation and Invariant Protection
In Domain-Driven Design (DDD), **Domain Entities** (`User`, `Tenant`, `Course`, `MediaAsset`) represent enterprise business logic. Entities must protect their internal state and ensure that invalid data mutations cannot occur.

#### Example: Class Encapsulation vs Mutable Objects

**❌ Weak (Pure Anemic Object):**
```js
// External code can directly corrupt state without validation
mediaAsset.status = 'ANYTHING_INVALID';
mediaAsset.updatedAt = null;
```

**✅ Strong (Class Aggregate Root):**
```js
class MediaAsset extends AggregateRoot {
  markUploaded() {
    this.props.status = this.mimeType.isVideo ? 'ENCODING' : 'READY';
    this.props.updatedAt = new Date();
  }
}

// Caller can only interact through validated domain methods
asset.markUploaded();
```

---

### 1.2 Polymorphism for Dependency Injection (DI)
Clean Architecture requires high-level business use cases to depend on **abstract contracts**, not concrete vendor libraries.

Classes enable standard Object-Oriented polymorphism:
- `StorageProvider` (Abstract) → `LocalStorageProvider` / `R2StorageProvider` / `S3StorageProvider`
- `IMediaAssetRepository` (Abstract) → `DrizzleMediaAssetRepository`

```js
// Fastify DI Container resolves the active provider polymorphically
container.register('StorageProvider', () => {
  if (process.env.R2_BUCKET_NAME) {
    return new R2StorageProvider(config);
  }
  return new LocalStorageProvider(config);
});

// Use cases invoke methods on the polymorphic instance without caring which cloud provider runs
const uploadResult = await storageProvider.upload(key, buffer, mimeType);
```

---

### 1.3 DDD Entity Identity vs Value Object Structural Equality

DDD makes a strict distinction between Entities and Value Objects:

1. **Entities (`User`, `Tenant`, `Course`):** Defined by explicit unique identity (`entity.id`). Two entities with identical attributes are distinct if their IDs differ.
2. **Value Objects (`Email`, `FileSize`, `Score`):** Defined by structural attribute value equality.

Classes provide clean instance methods (`.equals()`, `.getValue()`, `.megaBytes`):

```js
class FileSize extends ValueObject {
  get megaBytes() {
    return Math.round((this.props.bytes / (1024 * 1024)) * 100) / 100;
  }
  
  static create(bytes) {
    if (bytes <= 0 || bytes > 500 * 1024 * 1024) {
      return Result.fail('Invalid file size.');
    }
    return Result.ok(new FileSize({ bytes }));
  }
}
```

---

## 2. Where Functional Programming Excels in EOS

Functions are lightweight, stateless, and fast. In EOS, functions are preferred in the following layers:

1. **Fastify REST Route Registrations:**
   ```js
   async function mediaRoutes(fastify, options) {
     fastify.post('/presign', async (request, reply) => { ... });
   }
   ```
2. **Data Mappers & Serialization:**
   - `toDomain(row)` and `toPersistence(entity)` mapping functions.
3. **Next.js UI Components & React Hooks:**
   - Modern React UI (`apps/web`) uses 100% Functional Components and Hooks (`useState`, `useEffect`).

---

## 3. Industry Trends Analysis

```text
Industry Paradigm Breakdown (JavaScript & TypeScript)

Layer / Context                       Trend Standard           Dominant Paradigm
-----------------------------------------------------------------------------------------
Frontend UI (React / Next.js / Vue)   Functional Components    Functional Programming
Node.js Enterprise Backend (NestJS)   Controllers & Services   ES6 / TypeScript Classes
Object-Relational Mapping (ORM)      Drizzle / TypeORM        Classes & Fluent Builders
Cloud SDKs (AWS SDK v3, GCP, S3)      Client Instances         ES6 Classes (`new S3Client()`)
Domain-Driven Design (DDD)            Entities & Aggregates    ES6 Classes
```

---

## 4. Architectural Summary

In summary:
- **Classes** provide encapsulation, invariant guarantees, and polymorphic dependency injection for backend domain entities and infrastructure providers.
- **Functions** provide stateless performance, simple composition, and modern React UI component rendering.

The Education Operating System combines both paradigms into a cohesive, maintainable enterprise monorepo.

# EOS REST API Endpoint Reference Guide

This document provides a comprehensive specification of all **13 active REST API endpoints** implemented in `apps/api` for the Education Operating System (EOS).

---

## Base Base URLs

* **Internal API (Web App / Admin Dashboard):** `http://localhost:3001/api/v1/internal`
* **Public API (Authentication & Public Developer Routes):** `http://localhost:3001/api/v1/public`
* **Local Media Static Server:** `http://localhost:3001/uploads`

---

## Common Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt_access_token>
x-tenant-id: <tenant_uuid_or_slug>
```

---

# Endpoint Directory

---

### 1. User Registration
* **Endpoint:** `POST /api/v1/public/auth/register`
* **Scope:** Public
* **Purpose:** Registers a new user account with role assignment (e.g., `ADMIN`, `INSTRUCTOR`, `STUDENT`) and hashes password securely using Argon2id.
* **Request Body:**
  ```json
  {
    "email": "admin@institution.edu",
    "password": "SecurePassword123!",
    "name": "Jane Doe",
    "role": "ADMIN"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "usr_018f92ab-1234-7890-a1b2-c3d4e5f6a7b8",
      "email": "admin@institution.edu",
      "name": "Jane Doe",
      "role": "ADMIN"
    }
  }
  ```

---

### 2. User & Admin Login
* **Endpoint:** `POST /api/v1/public/auth/login`
* **Scope:** Public
* **Purpose:** Authenticates user credentials and returns a signed JWT access token for multi-tenant HTTP authorization.
* **Request Body:**
  ```json
  {
    "email": "admin@institution.edu",
    "password": "SecurePassword123!"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "usr_018f92ab-1234-7890-a1b2-c3d4e5f6a7b8",
        "email": "admin@institution.edu",
        "name": "Jane Doe",
        "role": "ADMIN"
      }
    }
  }
  ```

---

### 3. Fetch Course Catalog
* **Endpoint:** `GET /api/v1/internal/academics/courses`
* **Scope:** Internal (Scoped by `x-tenant-id`)
* **Purpose:** Retrieves all academic courses registered within the active institution context.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "crs_01917f8a-9c42-7a1b-8c4d-123456789abc",
        "code": "CS-101",
        "title": "Enterprise Educational Architecture",
        "description": "Learn clean architecture, domain aggregates, and scalable monorepo patterns.",
        "duration": "4 Weeks",
        "status": "ACTIVE"
      }
    ]
  }
  ```

---

### 4. Create Academic Course
* **Endpoint:** `POST /api/v1/internal/academics/courses`
* **Scope:** Internal (Scoped by `x-tenant-id`)
* **Purpose:** Creates a new course aggregate with defined Course Duration (e.g., `4 Weeks` or `8 Weeks`).
* **Request Body:**
  ```json
  {
    "code": "CS-204",
    "title": "Distributed Microservices Design",
    "description": "Event-driven microservice patterns and saga orchestrations.",
    "duration": "8 Weeks"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "crs_01917f8b-3d21-7b89-a2c3-987654321def",
      "code": "CS-204",
      "title": "Distributed Microservices Design",
      "description": "Event-driven microservice patterns and saga orchestrations.",
      "duration": "8 Weeks",
      "status": "ACTIVE"
    }
  }
  ```

---

### 5. Fetch Course Details
* **Endpoint:** `GET /api/v1/internal/academics/courses/:id`
* **Scope:** Internal
* **Purpose:** Retrieves detailed course metadata by course ID.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "crs_01917f8a-9c42-7a1b-8c4d-123456789abc",
      "code": "CS-101",
      "title": "Enterprise Educational Architecture",
      "description": "Learn clean architecture, domain aggregates, and scalable monorepo patterns.",
      "duration": "4 Weeks",
      "status": "ACTIVE"
    }
  }
  ```

---

### 6. Fetch Course Modules
* **Endpoint:** `GET /api/v1/internal/academics/courses/:id/modules`
* **Scope:** Internal
* **Purpose:** Retrieves all ordered curriculum lesson modules (Videos, PDFs, and Quizzes) associated with a specific course.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "mod_01",
        "courseId": "crs_01917f8a-9c42-7a1b-8c4d-123456789abc",
        "title": "Lecture 1: Architecture Core",
        "contentType": "VIDEO",
        "contentUrl": "http://localhost:3001/uploads/1741234_lecture1.mp4",
        "order": 1
      }
    ]
  }
  ```

---

### 7. Create Course Module
* **Endpoint:** `POST /api/v1/internal/academics/courses/:id/modules`
* **Scope:** Internal
* **Purpose:** Appends a new video stream, PDF reading document, or interactive quiz assessment to a course curriculum.
* **Request Body (Video / Document):**
  ```json
  {
    "title": "Chapter 1 Reading Handout (PDF)",
    "contentType": "DOCUMENT",
    "contentUrl": "http://localhost:3001/uploads/1741234_handout.pdf",
    "order": 2
  }
  ```
* **Request Body (Quiz Assessment):**
  ```json
  {
    "title": "End of Unit 1 Knowledge Check",
    "contentType": "QUIZ",
    "order": 3,
    "quiz": {
      "question": "What is the primary role of the Domain Aggregate in DDD?",
      "options": [
        { "key": "A", "text": "Domain Aggregate Root" },
        { "key": "B", "text": "Database ORM Model" },
        { "key": "C", "text": "REST API Endpoint Route" },
        { "key": "D", "text": "Microservice Container" }
      ],
      "correct": "A"
    }
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "mod_02",
      "courseId": "crs_01917f8a-9c42-7a1b-8c4d-123456789abc",
      "title": "End of Unit 1 Knowledge Check",
      "contentType": "QUIZ",
      "order": 3,
      "status": "PUBLISHED"
    }
  }
  ```

---

### 8. Mark Lesson Completed
* **Endpoint:** `POST /api/v1/internal/learning/lessons/complete`
* **Scope:** Internal
* **Purpose:** Records student progress completion for a specific lesson module.
* **Request Body:**
  ```json
  {
    "studentUserId": "usr_018f92ab-1234-7890-a1b2-c3d4e5f6a7b8",
    "lessonModuleId": "mod_01"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "completed": true,
      "completedAt": "2026-09-05T00:15:00.000Z"
    }
  }
  ```

---

### 9. Submit Quiz Assessment
* **Endpoint:** `POST /api/v1/internal/learning/quizzes/submit`
* **Scope:** Internal
* **Purpose:** Evaluates student quiz submission, calculates score %, and records pass/fail status.
* **Request Body:**
  ```json
  {
    "studentUserId": "usr_018f92ab-1234-7890-a1b2-c3d4e5f6a7b8",
    "lessonModuleId": "mod_03",
    "score": 100,
    "passingScore": 80
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "score": 100,
      "passed": true,
      "submittedAt": "2026-09-05T00:15:00.000Z"
    }
  }
  ```

---

### 10. Upload Media File
* **Endpoint:** `POST /api/v1/internal/media/upload`
* **Scope:** Internal
* **Purpose:** Accepts base64 encoded lecture videos (`.mp4`) or PDF documents, saves them directly to local `./uploads/` storage on disk, and returns a public URL.
* **Request Body:**
  ```json
  {
    "filename": "lecture1.mp4",
    "fileData": "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1w...",
    "mimeType": "video/mp4"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "filename": "1741234_lecture1.mp4",
      "path": "/home/chakresh/EducationOS/apps/api/uploads/1741234_lecture1.mp4",
      "url": "http://localhost:3001/uploads/1741234_lecture1.mp4",
      "mimeType": "video/mp4"
    }
  }
  ```

---

### 11. Presign Upload URL
* **Endpoint:** `POST /api/v1/internal/media/presign`
* **Scope:** Internal
* **Purpose:** Generates presigned upload credentials for Cloudflare R2 or AWS S3 direct cloud uploads.
* **Request Body:**
  ```json
  {
    "tenantId": "01917f8a-9c42-7a1b-8c4d-123456789abc",
    "filename": "lecture_raw.mp4",
    "mimeType": "video/mp4",
    "sizeBytes": 52428800
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "uploadUrl": "https://r2.storage.provider/presigned-key",
      "mediaAssetId": "ast_01917f8c-1234"
    }
  }
  ```

---

### 12. Confirm Media Upload
* **Endpoint:** `POST /api/v1/internal/media/confirm`
* **Scope:** Internal
* **Purpose:** Confirms direct cloud media upload execution and transitions MediaAsset entity state to `READY`.
* **Request Body:**
  ```json
  {
    "mediaAssetId": "ast_01917f8c-1234"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "ast_01917f8c-1234",
      "status": "READY"
    }
  }
  ```

---

### 13. Provision Institution & Branch Tenant
* **Endpoint:** `POST /api/v1/internal/tenants`
* **Scope:** Internal
* **Purpose:** Provisions a new multi-tenant institution workspace, subdomain slug, and default campus branch organization.
* **Request Body:**
  ```json
  {
    "tenantName": "Oxford Institute of Technology",
    "slug": "oxford-tech",
    "organizationName": "Main Campus"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "tenant": {
        "id": "tnt_01917f8d-5678",
        "name": "Oxford Institute of Technology",
        "slug": "oxford-tech"
      },
      "organization": {
        "id": "org_01917f8e-9012",
        "name": "Main Campus"
      }
    }
  }
  ```

---

### 14. Static Media Streaming Server
* **Endpoint:** `GET /uploads/:filename`
* **Scope:** Public / Media Stream
* **Purpose:** Serves video files (`.mp4`) and documents (`.pdf`) saved on local disk to the Next.js LMS Classroom Player.

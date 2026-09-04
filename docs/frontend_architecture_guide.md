# Frontend Architecture & Design Guide (`apps/web`)

## 1. Executive Summary & Overview

The `apps/web` application is the enterprise front-end portal for the Education Operating System (EOS). Built using **Next.js 16 (App Router)**, **Vanilla CSS**, **Outfit** (headings) & **Inter** (body) typography, **shadcn UI** component patterns, and **Phosphor Icons** (`@phosphor-icons/react`), it provides a solid minimalist, high-contrast, multi-tenant UI for institution administrators, instructors, and students.

---

## 2. Design System Architecture: Solid Modern Minimalism

To ensure crisp readability and executive SaaS aesthetics, all visual tokens favor **Solid Minimalist Surfaces** with **Zero Gradients**.

### Brand Color Tokens Specification (Extracted Swatch)

| Swatch Layer | Color Name | Hex Code | HSL Token | Usage Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1** | Obsidian Pitch Black | `#0A0E14` | `220 30% 6%` | Dark Mode Viewport Background / High Contrast Text |
| **Layer 2** | Deep Slate Blue | `#142530` | `204 41% 15%` | Solid Containers, Dark Cards, Border Lines |
| **Layer 3** | Electric Vibrant Orange | `#FF7328` | `22 100% 58%` | Primary Buttons, Active States, Glowing Badges |
| **Layer 4** | Crisp Off-White | `#EEF2F6` | `210 25% 95%` | Light Mode Viewport Background / Crisp Cards |

### Typography Hierarchy

- **Headings (`h1`-`h6`):** `Outfit` (Google Font) — Bold, modern geometric sans-serif for high-impact titles (`500`, `600`, `700`, `800`).
- **Body & UI Text:** `Inter` (Google Font) — High-legibility geometric sans-serif (`15px` body, `16px` inputs, `18px-32px` section titles).
- **Code Mono:** `JetBrains_Mono` (Google Font) — Monospace font for IDs, course codes, & technical metrics.

---

## 3. Directory Layout & Key Modules

```
apps/web/
├── app/
│   ├── globals.css                # Solid Minimalist Theme CSS (Zero Gradients)
│   ├── layout.js                 # Root Layout + Outfit/Inter Fonts + AuthProvider
│   ├── page.js                   # Hero Landing Page (Solid Minimalist)
│   ├── login/
│   │   └── page.js               # Dual-Tab Auth Portal (Dynamic Institution Registration)
│   └── dashboard/
│       ├── layout.js             # Sidebar Shell (Overview, Courses, Tenants, Students nav)
│       ├── page.js               # Executive Analytics Overview
│       ├── courses/
│       │   ├── page.js           # Course Catalog & Duration Management
│       │   └── [id]/
│       │       ├── page.js       # Curriculum Builder (Video, PDF, Quiz Modules)
│       │       └── learn/
│       │           └── page.js   # Student LMS Video & Interactive Quiz Player
│       ├── students/
│       │   └── page.js           # Student Roster & Enrollment Management
│       └── tenants/
│           └── page.js           # Institution & Campus Branch Provisioning UI
├── components/
│   └── ui/                       # shadcn UI Primitives (Button, Card, Input, Badge)
├── lib/
│   └── api.js                    # Direct REST ApiClient (No mock client fallbacks)
└── providers/
    └── auth-context.js           # React AuthContext (JWT Token & Tenant binding)
```

---

## 4. Work Completed & Recent Enhancements

1. **Direct Backend API Connectivity:**
   * Removed legacy client-side array fallbacks in `ApiClient`. API requests interact directly with the Fastify REST backend & Neon Cloud PostgreSQL.

2. **JWT Authentication & Auto-Login (`auth-context.js`):**
   * Registration automatically performs a backend login, receiving and storing a real signed **HS256 JWT** into `localStorage` (`eos_token`).

3. **Web-Based Institution & Campus Provisioning (`/dashboard/tenants`):**
   * Integrated 1-click **Provision Campus Branch & Tenant** modal interface posting directly to `POST /api/v1/internal/tenants`.

4. **Student LMS Video & Quiz Player (`/dashboard/courses/[id]/learn`):**
   * Interactive classroom page featuring HTML5 video streaming player, PDF reader, and instant quiz scoring with progress tracking.

5. **Course Curriculum & Quiz Builder (`/dashboard/courses/[id]`):**
   * Lesson module builder supporting Video streams (`.mp4`), PDF document assignments, and Quiz assessments using standard UUID primary keys.

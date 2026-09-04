# Frontend Architecture & Design Guide (`apps/web`)

## 1. Executive Summary & Overview

The `apps/web` application is the enterprise front-end portal for the Education Operating System (EOS). Built using **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Outfit** (headings) & **Inter** (body) typography, **shadcn UI** component patterns, and **Phosphor Icons** (`@phosphor-icons/react`), it provides a solid minimalist, high-contrast, multi-tenant UI for institution administrators, instructors, and students.

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
│       ├── layout.js             # Sidebar Shell (Overview, Courses, Students nav)
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
│           └── page.js           # Institution Provisioning
├── components/
│   └── ui/                       # shadcn UI Primitives (Button, Card, Input, Badge)
├── lib/
│   └── api.js                    # REST ApiClient (Courses, Modules, Tenants)
└── providers/
    └── auth-context.js           # React AuthContext (Session & Tenant binding)
```

---

## 4. Work Completed & Recent Enhancements

1. **Solid Minimalist UI Overhaul:**
   - Purged all background gradients across all routes (`/`, `/login`, `/dashboard`, `/dashboard/courses`).
   - Standardized solid surface colors, 2px borders, and high-contrast text.

2. **Typography Scaling:**
   - Upgraded titles to `Outfit` bold weights and scaled heading font sizes (`text-3xl`, `text-5xl`, `text-7xl`).
   - Increased body font readability (15px body, 16px input text).

3. **Dynamic Institution Binding & Zero Dummy Data:**
   - Single-tenant binding tied dynamically to registered institution names.
   - Cleared all hardcoded mock placeholders across course catalog & student rosters.

4. **Course Curriculum & Quiz Builder (`/dashboard/courses/[id]`):**
   - Lesson module builder supporting Video streams (`.mp4`), PDF document assignments, and Quiz assessments.
   - Replaced legacy "Credits" terminology with **Course Duration** (e.g. `4 Weeks`).

5. **Student LMS Video & Quiz Player (`/dashboard/courses/[id]/learn`):**
   - Interactive classroom page featuring streaming HTML5 video player, PDF reader, and instant quiz scoring with progress tracking.

6. **Student Roster Management (`/dashboard/students`):**
   - Student enrollment form, cohort metrics cards, and student roster table.

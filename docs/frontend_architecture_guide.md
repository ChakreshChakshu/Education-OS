# Frontend Architecture & Design Guide (`apps/web`)

## 1. Executive Summary & Overview

The `apps/web` application is the enterprise front-end portal for the Education Operating System (EOS). Built using **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Plus Jakarta Sans** typography, **shadcn UI** component patterns, and **Phosphor Icons** (`@phosphor-icons/react`), it provides a high-aesthetic, multi-tenant UI for institution administrators, instructors, and students.

---

## 2. Design System Architecture: Single Source of Truth

To ensure consistent branding, theme customizability, and rapid palette swapping, all visual tokens are defined in a **Single Source of Truth**: `apps/web/app/globals.css`.

### Brand Color Tokens Specification (Extracted Swatch)

| Swatch Layer | Color Name | Hex Code | HSL Token | Usage Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1** | Obsidian Pitch Black | `#0A0E14` | `220 30% 6%` | Dark Mode Viewport Background / High Contrast Text |
| **Layer 2** | Deep Slate Blue | `#1F3A4B` | `204 41% 21%` | Secondary Containers, Dark Cards, Border Lines |
| **Layer 3** | Electric Vibrant Orange | `#FF7328` | `22 100% 58%` | Primary Buttons, Active States, Glowing Badges |
| **Layer 4** | Crisp Off-White | `#EEF2F6` | `210 25% 95%` | Light Mode Viewport Background / Crisp Cards |

### Typography

- **Primary Sans:** `Plus_Jakarta_Sans` (Google Font) — Modern, eye-catching geometric sans-serif for UI headings & body.
- **Code Mono:** `JetBrains_Mono` (Google Font) — Monospace font for IDs, tokens, & technical metrics.

---

## 3. Directory Layout & Module Responsibilities

```
apps/web/
├── app/
│   ├── globals.css                # Single Source of Truth Theme CSS (Brand Swatch)
│   ├── layout.js                 # Root Next.js Layout + Plus Jakarta Sans + AuthProvider
│   ├── page.js                   # Hero Landing Page
│   ├── login/
│   │   └── page.js               # Dual-Tab Auth Portal (Login + Registration)
│   └── dashboard/
│       ├── layout.js             # Collapsible Sidebar Shell + Tenant Switcher
│       ├── page.js               # Executive Analytics & Activity Stream
│       ├── courses/
│       │   └── page.js           # Course Management Grid & Modal
│       └── tenants/
│           └── page.js           # Multi-Tenant Branch Provisioning
├── components/
│   └── ui/                       # shadcn UI Primitives
│       ├── button.jsx            # CVA Button with 6 variants
│       ├── card.jsx              # Card, Header, Title, Description, Content
│       ├── input.jsx             # Accessible Input with focus ring
│       └── badge.jsx             # Status Pill Badges
├── lib/
│   ├── api.js                    # REST ApiClient with token & x-tenant-id headers
│   └── utils.js                  # Tailwind class merger (`cn(...)`)
└── providers/
    └── auth-context.js           # React Context for session & tenant switching
```

---

## 4. Multi-Tenant Context Ingestion

All HTTP API requests executed via `ApiClient` automatically inject:
1. `Authorization: Bearer <jwt-token>`
2. `x-tenant-id: <active-tenant-id>`

This guarantees institutional data segregation across Bounded Context API routes.

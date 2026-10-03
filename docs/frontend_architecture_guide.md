# Frontend Architecture & Design Guide (`apps/web`)

## 1. Executive Summary & Overview

The `apps/web` application is the enterprise front-end portal for the Education Operating System (EOS). Built using **Next.js 16 (App Router)**, **Vanilla CSS & Tailwind CSS v4**, **Outfit** (headings) & **Inter** (body) typography, **shadcn UI** component primitives, and **Phosphor Icons** (`@phosphor-icons/react`), it provides a high-contrast, multi-tenant UI for institution administrators, instructors, and students.

---

## 2. Design System Architecture: Solid Modern Minimalism & Dynamic Themes

To ensure crisp readability, executive SaaS aesthetics, and high institutional brand fidelity, all visual tokens favor **Solid Minimalist Surfaces** with dynamic brand theming.

### Dynamic Tenant Theme Engine

EOS implements a client-side theme engine that reads the active institution's branding and dynamically updates root CSS variables in the browser DOM:

- **Theme Converter (`hexToHsl`)**: Converts any tenant hex swatch (`#RRGGBB` or `#RGB`) into standardized HSL degrees, saturation, and lightness tokens.
- **Root CSS Variables**: `applyTenantTheme(colorHex)` injects:
  - `--primary`: Active brand hue (used by buttons, badges, navigation indicators, active borders).
  - `--ring`: Matching focus ring hue with dynamic contrast.
  - `--primary-foreground`: Computed dynamically (`0 0% 0%` for light swatches, `0 0% 100%` for dark swatches) to ensure WCAG AAA text contrast.
- **Instant Persistence**: Updates persist directly to Neon PostgreSQL `tenants.settings_json` via `PATCH /api/v1/internal/tenants/current/settings` and trigger real-time UI updates across all open tabs.

### Curated Educational Palettes

| Palette Name | Hex Code | HSL Token | Target Atmosphere |
| :--- | :--- | :--- | :--- |
| **Deep Violet** (Default) | `#5b12ed` | `260 87% 50%` | Modern technical universities & enterprise portals |
| **Oxford Blue** | `#1e40af` | `224 71% 40%` | Classic collegiate institutions & law academies |
| **Emerald Campus** | `#059669` | `161 94% 30%` | Agricultural, biological, and health sciences |
| **Crimson Academy** | `#dc2626` | `0 72% 51%` | Heritage universities & medical schools |
| **Amber Poly** | `#d97706` | `37 92% 44%` | Engineering institutes & polytechnics |
| **Royal Indigo** | `#4338ca` | `244 58% 53%` | Liberal arts & research institutions |
| **Cyan Tech** | `#0891b2` | `189 91% 36%` | Coding bootcamps & computer science faculties |
| **Electric Slate** | `#334155` | `215 25% 27%` | Executive business academies & corporate learning |

### Global Typography & Readability Scale

To prevent visual fatigue and optimize scannability across dense data tables, student rosters, and curriculum modules:
- **Base Root Font**: Scaled from standard `15px` up to `16px` (`font-size: 16px` on `html, body`).
- **Micro-Token Scaling**:
  - `text-[10px]` scaled to `12px` (`text-xs`).
  - `text-[11px]` scaled to `13px`.
  - `text-xs` scaled to `13px`.
  - `text-sm` scaled to `15px` (optimal for table rows and secondary metadata).
  - `text-base` scaled to `17px` (optimal for paragraph text and student lesson notes).
- **Headings (`h1`-`h6`)**: `Outfit` (Google Font) — Geometric sans-serif for high-impact titles (`500`, `600`, `700`, `800`).
- **Body & UI Text**: `Inter` (Google Font) — High-legibility sans-serif for inputs, table cells, and learning content.
- **Code Mono**: `JetBrains Mono` (Google Font) — Monospace font for UUIDs, course codes, and technical metrics.

---

## 3. Directory Layout & Key Modules

```
apps/web/
├── app/
│   ├── globals.css                # Solid Minimalist Theme CSS & Typography Tokens
│   ├── layout.js                 # Root Layout + Outfit/Inter/JetBrains Fonts + AuthProvider
│   ├── page.js                   # Streamlined Landing Page + Platform Spotlight + Carousel
│   ├── login/
│   │   └── page.js               # Multi-Tenant Login Portal with MultiStepLoader
│   ├── register/
│   │   └── page.js               # High-Velocity 3-Step Institution Onboarding
│   └── dashboard/
│       ├── layout.js             # Sidebar Shell (Overview, Courses, Tenants, Students, Settings)
│       ├── page.js               # Executive Analytics & Cohort Velocity Overview
│       ├── courses/
│       │   ├── page.js           # Course Catalog & Duration Management
│       │   └── [id]/
│       │       ├── page.js       # Curriculum Builder (Video, PDF, Quiz Modules)
│       │       └── learn/
│       │           └── page.js   # Student LMS Video & Interactive Quiz Player
│       ├── settings/
│       │   └── page.js           # Tenant Branding, Campus Parameters & RBAC Preferences
│       ├── students/
│       │   └── page.js           # Student Roster, Batches & Enrollment Management
│       └── tenants/
│           └── page.js           # Multi-Campus Branch Provisioning UI
├── components/
│   ├── auth-multi-step-loader.tsx# Auth & Registration Step Transitions
│   ├── apple-cards-carousel-demo.tsx # Core Architecture Interactive Carousel
│   └── ui/                       # shadcn UI & Aceternity UI Primitives
│       ├── apple-cards-carousel.tsx # Touch/Pointer Animated Carousel with Modal Dialogs
│       ├── button.tsx            # Fully Typed TypeScript Button with CVA Variants
│       ├── multi-step-loader.tsx # Animated Loading Sequence with Framer Motion
│       ├── card.jsx              # Surface Card Containers
│       ├── input.jsx             # Accessible Form Inputs
│       └── badge.jsx             # Status Indicators & Role Chips
├── hooks/
│   └── use-outside-click.tsx     # Hook for Modal/Dropdown Dismissal
├── lib/
│   └── api.js                    # REST ApiClient with CSRF Double-Submit Protection
└── providers/
    └── auth-context.js           # React AuthContext (Session Bootstrap & Dynamic Theme Engine)
```

---

## 4. Key Workflows & Features Implemented

### 1. High-Velocity 3-Step Registration Flow (`/register`)

Condensed from 5 fragmented steps down to 3 focused, high-velocity onboarding steps:
- **Step 1: Admin Account & Security**: Full Name, Work Email, and Password with real-time validation.
- **Step 2: Campus & Brand Identity**: Institution Name, live Subdomain Slug availability check against database, and interactive 8-swatch Brand Palette Selector with custom hex input.
- **Step 3: Academic Setup & Launch**: Branch Name, Academic Term (e.g. *Fall 2026*), Timezone, and Campus Physical Address.
- **Transition Feedback**: Integrated `AuthMultiStepLoader` showcasing live progress:
  1. *Securing administrative credentials*
  2. *Provisioning isolated campus database workspace*
  3. *Applying institutional brand palette*
  4. *Finalizing academic calendar & branch routing*
  5. *Signing in to executive command center*

### 2. Streamlined Home Landing Page (`/`)

Modernized and trimmed by 30%+ code bloat to eliminate reading fatigue and deliver immediate value:
- **Hero Header**: Live counter badges, high-contrast typography, and primary CTA.
- **Platform Spotlight**: 3-tab interactive live preview switching between:
  - *Campus Network*: Real-time branch governance and multi-campus sync.
  - *HD Classroom Player*: Low-latency HLS video player with interactive quiz cards.
  - *Cohort Velocity*: Retention analytics, grading pipelines, and completion rates.
- **Core Architecture Showcase**: Integrated `AppleCardsCarousel` presenting expandable deep-dive cards for:
  - Multi-Tenant Campus Isolation
  - High-Definition HLS Video Delivery
  - Concurrency-Proof Exam Submissions
  - Zero-Timeout Finals
  - FERPA & GDPR Student Privacy

### 3. Campus Settings & Role Restrictions (`/dashboard/settings`)

- **Institutional Branding**: Live color picker with real-time DOM injection preview, secondary accent selection, tagline, and support email configuration.
- **Campus Details**: Branch name, operational timezone, and current active academic term.
- **Role Scoping (`STUDENT` restriction)**:
  - Students navigating to `/dashboard/settings` see a clear read-only banner explaining administrative restrictions.
  - The API endpoint `PATCH /api/v1/internal/tenants/current/settings` strictly checks the user's role and rejects student mutations with `403 Forbidden`.

### 4. Component Library Enhancements

- **`Button` Component (`apps/web/components/ui/button.tsx`)**: Rebuilt from untyped `.jsx` to TypeScript with full `ButtonProps`, `VariantProps`, and `forwardRef` support. Variants include `default`, `destructive`, `outline`, `secondary`, `ghost`, and `link`.
- **`MultiStepLoader` (`apps/web/components/ui/multi-step-loader.tsx`)**: Framer Motion spring-animated state machine supporting arbitrary loading steps, backdrop blurring, and accessibility.
- **`AppleCardsCarousel` (`apps/web/components/ui/apple-cards-carousel.tsx`)**: Horizontal smooth scroll container with card expansion into full-screen dialogs, dismissible via ESC, click outside, or close button.

### 5. Authentication & Cookie-Based Security

- **HttpOnly Cookies**: Session tokens (`access_token`, `refresh_token`) are managed in secure `httpOnly` cookies set by the Fastify backend.
- **Double-Submit CSRF**: The frontend extracts `csrf_token` and attaches it via the `x-csrf-token` header on all mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Session Bootstrap**: On application load, `ApiClient.getMe()` verifies session status and hydrates available tenants and roles.

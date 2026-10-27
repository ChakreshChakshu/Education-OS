# EducationOS — Student LMS Dashboard UI/UX Specification (`design.md`)

> **Design Intelligence Standard:** Generated via `ui-ux-pro-max` (Bento Grids + Dimensional Soft-Card Architecture).  
> **Source Reference:** Educame 3-Column Modern LMS Interface.  
> **Target Page:** `/dashboard` (Student Portal View).

---

## 1. Executive Summary & Design System

The new Student LMS Dashboard provides a high-retention, distraction-free educational hub. It synthesizes the visual elegance of the **Educame reference mockup** with **EducationOS's multi-tenant engine** and **live Neon PostgreSQL database pipeline**.

### Core Style Tokens (UI Pro Max Bento Specification)
- **Architecture:** Bento Grid Modular Layout (3-Column Responsive Stage).
- **Surface Elevation:**
  - Base Page: `#F8FAFC` (Light) / `#09090B` (Dark).
  - Cards & Panels: `#FFFFFF` (Light) / `#18181B` (Dark) with `border border-border/70 shadow-xs`.
  - Elevated Popups / Tooltips: `#0F172A` (Dark pill tooltip) / `#1E293B` (Dropdown/flyouts).
- **Corners & Radius:**
  - Outer Containers: `rounded-3xl` (24px).
  - Internal Cards: `rounded-2xl` (16px).
  - Badges & Buttons: `rounded-xl` (12px) and pill `rounded-full`.
- **Dynamic Brand Accents:**
  - Tenant Primary: `var(--primary)` (dynamic HSL injected from active tenant settings).
  - Highlight Accent: Coral / Salmon (`#FF6565` / `#F87171`) for high-urgency CTAs ("Join Classroom", "Semester Score" tooltip).
  - Success / Completion: Emerald (`#10B981` / `#059669`).
  - Progress Tracks: `bg-muted/70` with soft pill bar indicators.
- **Typography:**
  - Headings: `Outfit` (Bold / Extrabold, tracking-tight).
  - Body & UI Controls: `Inter` (500 / 600 weight, high legibility).
  - Metrics, Codes & Times: `JetBrains Mono` / `Fira Code` (`text-xs font-mono font-bold`).

---

## 2. 3-Column Layout Blueprint

```text
┌─────────────────────────┬─────────────────────────────────────────────────┬─────────────────────────┐
│ 1. Left Nav (w-64)      │ 2. Center Main Learning Hub (flex-1)             │ 3. Right Panel (w-84)   │
├─────────────────────────┼─────────────────────────────────────────────────┼─────────────────────────┤
│ • Full Horizontal       │ • Header: "Hi, Kevin William 👋"                │ • Top Search Bar +      │
│   Institution Logo      │   "Welcome back, nice to see you again!"        │   Notifications + User  │
│                         │                                                 │                         │
│ • Navigation Links:     │ • Card 1: Semester's Grade Performance Chart    │ • Interactive Monthly   │
│   - Dashboard (Active)  │   - 6-Cycle Pill Bar Chart with Floating Tooltip│   Mini Calendar Widget  │
│   - Course Catalog      │   - Summary Stack: GPA (3.85) | Points | Credits│   (Active Date Pill)    │
│   - Schedule            │                                                 │                         │
│   - Grades & Quizzes    │ • Section 2: "My Classes" (2-col Grid)          │ • "Upcoming" Timetable: │
│   - Settings            │   - Card A: Interaction Engineering             │   - 08:00 - 11:30 Slots │
│                         │   - Card B: Machine Learning Architecture       │   - Highlighted Session │
│ • Mobile Promo Card     │                                                 │     Card ("Join Class"  │
│   (App Store + GPlay)   │ • Section 3: "Today Tasks" Syllabus Checklist   │     Coral CTA Button)   │
│                         │   - Lesson A: HCI Design System (Completed)     │                         │
│ • Sign Out              │   - Lesson B: IA Analysis (Pending)             │                         │
└─────────────────────────┴─────────────────────────────────────────────────┴─────────────────────────┘
```

---

## 3. Component Deep Dive

### 3.1. `StudentGreetingHeader`
- **Location:** Top left of Center Stage.
- **Content:**
  - `h1`: `Hi, {user.name} 👋` (`text-2xl sm:text-3xl font-extrabold tracking-tight`).
  - Subtitle: `Welcome back, nice to see you again!` (`text-xs text-muted-foreground font-medium`).
  - Active Campus Pill: Dynamic badge displaying `{activeTenant.name}` & branch.

### 3.2. `PerformanceBarChart` (Hero Card)
- **Title:** "Semester's Grade" or "Curriculum Mastery".
- **Pagination Controls:** Mini cycle arrows (`<` `>`).
- **Bar Visualization:**
  - 6 vertical rounded pill tracks (`bg-muted/50 rounded-full h-40 w-7 relative overflow-hidden flex items-end`).
  - Filled pill bar (`bg-gradient-to-t from-primary/80 to-primary rounded-full w-full transition-all duration-500 ease-out`).
  - Floating Tooltip Pill: Positioned above highest/active bar displaying score (e.g. `3.85 GPA` or `92%`).
- **Summary Side Stack:**
  - Metric 1: **GPA / Grade Point** with violet icon box (`3.85 GPA`).
  - Metric 2: **Total Grade / Score Points** with coral icon box (`490 Points`).
  - Metric 3: **Total Credits / Modules** with amber icon box (`137 Credits`).

### 3.3. `StudentClassCard` ("My Classes" 2-Col Grid)
- **Top Row:**
  - Rounded square avatar/thumbnail with gradient backdrop or course image.
  - Course Title (`font-bold text-base text-foreground line-clamp-1`).
  - Instructor metadata (`text-xs text-muted-foreground flex items-center gap-1.5`).
  - Options button (`DotsThreeVertical`).
- **Metadata Matrix (2x2 Grid):**
  - Lessons count (`BookOpen` icon, e.g. `8 Lessons`).
  - Academic Credits (`GraduationCap` icon, e.g. `3 Credits`).
  - Cohort Students (`Users` icon, e.g. `32 Students`).
  - Estimated Time (`Clock` icon, e.g. `3 Hours/Week`).
- **Action CTA:**
  - Full-width button: `"View Class"` / `"Enter Classroom"` with smooth hover background transition.

### 3.4. `DashboardTaskList` ("Today Tasks")
- **Header:** "Today Tasks" + count badge (e.g. `4 results`) + "View all tasks >".
- **Task Row Item:**
  - Thumbnail / Media icon container (Video camera for lecture, Question mark for quiz, FileText for reading).
  - Title (`Task Document for Clean Architecture`).
  - Course Tag (`text-[11px] font-mono font-bold text-muted-foreground`).
  - Due Date (`text-xs text-muted-foreground`).
  - Status Indicator: Checkbox toggle triggering instant lesson completion sync with Neon DB.

### 3.5. `DashboardScheduleSidebar` (Right 3rd Column)
- **Header Utility Bar:**
  - Quick Search input (`Search courses, lessons...` with `MagnifyingGlass` icon).
  - Notification icon with active pulse badge.
  - Student Avatar with initials fallback.
- **Interactive Mini Calendar:**
  - Month Header: Current month & year (e.g. `October, 2026`) + Month navigation chevrons (`<` `>`).
  - Day Headers: `SUN`, `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT` (`text-[10px] font-bold text-muted-foreground`).
  - Days Grid: Date numbers with current day highlighted in brand pill (`bg-primary text-primary-foreground font-bold shadow-xs`).
  - Active Session Indicators: Dots below dates with scheduled cohort lectures.
- **Upcoming Lecture Timetable:**
  - Header: "Upcoming" + Day filter pill (`Today v`, Date e.g. `Monday, 27 October`).
  - Time Markers: `08:00`, `09:30`, `11:00`, `14:00` with vertical connector line.
  - **Spotlight Active Lecture Card:**
    - High-contrast card with coral accent border (`border-primary/40` or `#FF6565`).
    - Title: e.g. `Machine Learning Architecture`.
    - Instructor & Meeting link: `Eleanor Pena` • `Live Stream Stream`.
    - Time range: `10:30 - 11:30 AM`.
    - Primary CTA: Coral / Brand filled button `"Join Classroom Now"` linking directly to `/dashboard/courses/[id]/lesson/[firstLessonId]`.

### 3.6. `MobileAppBanner` (Left Sidebar Bottom)
- **Visuals:** Soft rounded card with download icon, text `"EducationOS for Mobile"`, App Store and Google Play icons.
- **Action:** `"Download Now"` button.

---

## 4. UI/UX Rules & Accessibility Verification (from `ui-ux-pro-max`)

1. **Strict Icon Consistency:** Use `@phosphor-icons/react` SVG icons exclusively (`GraduationCap`, `BookOpen`, `Users`, `Clock`, `Calendar`, `PlayCircle`, `CheckCircle`, `DotsThreeVertical`). Zero emojis used as UI icons.
2. **Cursor & Interactive Feedback:** Every card, button, date cell, and checkbox has `cursor-pointer` and smooth `transition-all duration-200`.
3. **Contrast Compliance:**
   - Light Mode: Text uses `text-foreground` (`#0F172A`) and `text-muted-foreground` (`#64748b`) with minimum 4.5:1 contrast against `#FFFFFF`.
   - Dark Mode: Surface uses `#18181B` with `#F8FAFC` typography.
4. **Layout Stability:** No hover scale animations that cause layout shifts or scroll jumping (`hover:scale-105` only on contained thumbnail images).
5. **Reduced Motion:** All transitions respect `motion-reduce:transition-none`.

---

## 5. File Construction Plan

1. **`apps/web/components/dashboard/performance-bar-chart.jsx`**: Reusable interactive pill bar chart with tooltip and KPI stat pills.
2. **`apps/web/components/dashboard/student-class-card.jsx`**: Reusable Educame-style 2-col course card.
3. **`apps/web/components/dashboard/dashboard-task-list.jsx`**: Interactive lesson checklist with completion state.
4. **`apps/web/components/dashboard/dashboard-schedule-sidebar.jsx`**: Interactive calendar + upcoming timeline with "Join Classroom" CTA.
5. **`apps/web/components/dashboard/mobile-app-banner.jsx`**: Sidebar app download card.
6. **`apps/web/app/dashboard/page.js`**: Assemble 3-column stage integrating all components with real Neon PostgreSQL course and enrollment data.

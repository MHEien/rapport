# Rapport PWA — Design Document

A professional field service reporting application for heavy machinery technicians.

---

## Overview

**Purpose:** Enable technicians to complete equipment inspections in challenging conditions (dark basements, gloved hands, offline environments) with a premium mobile-first experience.

**Stack:**
- Next.js 16 (App Router)
- Prisma + PostgreSQL
- TanStack Query (offline mutations)
- Vercel Blob (photos/signatures)
- Shadcn UI (dark mode)
- @react-pdf/renderer (client-side PDF)
- xlsx (Excel import/export)

---

## Data Model

```
User
├── Reports[]
    ├── ChecklistResult[]
    │   └── Media[] (photos)
    └── signatureUrl

ServicePoint (templates)
└── productType, category, text
```

### Key Entities

| Model | Purpose |
|-------|---------|
| `Report` | A service visit with customer, equipment, results |
| `ChecklistResult` | Answer to a service point (OK/Should Fix/Must Fix) |
| `Media` | Photo evidence attached to a checklist result |
| `ServicePoint` | Master template defining inspection points per product type |

---

## User Flows

### 1. Report Creation (Mobile Focus Mode)

```
[Start Report] 
    → Step 1: Equipment Info (serial, hours, customer)
    → Step 2: Focus Mode Checklist (one item at a time)
    → Step 3: Summary + Signature
    → [Complete]
```

### 2. Premium Dashboard

```
[Dashboard]
    → Stats Cards (Today, Sync Status, etc.)
    → Recent Reports (Quick Access)
    → "New Report" Wizard Quick Launch
```

---

## Routes

| Route | Status | Description |
|-------|--------|-------------|
| `/` | ✅ Done | Premium Dashboard |
| `/report/[id]/edit` | ✅ Done | Mobile wizard flow |
| `/report/[id]` | ✅ Done | View completed report (PDF) |
| `/reports` | ✅ Done | Report archive with search |
| `/data-editor` | ✅ Done | Manage service points & Excel |
| `/auth/*` | ✅ Done | Better Auth routes |

---

## Design Principles

1. **Field-First**
   - Dark mode default (battery, low-light)
   - Large touch targets (≥64px)
   - One action at a time (wizard pattern)

2. **Offline-First**
   - Optimistic UI updates
   - localStorage mutation queue
   - Sync indicators visible

3. **Evidence-Rich**
   - Photo capture per checkpoint
   - Signature capture on completion
   - All media stored in Vercel Blob

---

## Roadmap Status

### Phase 1: Core Mobile ✅
- [x] Focus Mode Checklist
- [x] Offline mutations
- [x] Photo capture
- [x] Signature pad

### Phase 2: Report Lifecycle ✅
- [x] Create new report flow
- [x] Report view (read-only)
- [x] PDF generation (react-pdf)
- [x] Report archive with search

### Phase 3: Data Management ✅
- [x] Service points editor
- [x] Product type management
- [x] Excel import/export

### Phase 4: Team Features ✅
- [x] Multi-technician support
- [x] Report assignment (server actions ready)
- [x] Admin dashboard

### Phase 5: Advanced
- [ ] AI summary generation
- [ ] Customer portal (view-only links)
- [ ] Push notifications for assignments

---

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| TanStack Query over SWR | Better mutation handling + offline support |
| Vercel Blob over S3 | Zero-config, native Next.js integration |
| Canvas signature vs library | Lightweight, no extra dependencies |
| Dark mode default | Battery savings, field conditions |
| Norwegian preserved | Matches brother's original for familiarity |
| React-PDF | Client-side generation, offline capable, premium styling |
| XLSX | Robust Excel parsing for bulk import |

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

### 2. Desktop Dashboard (Original)

```
[Dashboard]
    → Left: Assignment details
    → Center: Checklist table with toggles
    → Add equipment to single report
    → [Save] / [PDF]
```

---

## Routes

| Route | Status | Description |
|-------|--------|-------------|
| `/` | 🟡 Planned | Landing / Dashboard |
| `/report/[id]/edit` | ✅ Done | Mobile wizard flow |
| `/report/[id]` | 🟡 Planned | View completed report |
| `/reports` | 🟡 Planned | Report archive with search |
| `/data-editor` | 🟡 Planned | Manage service points |
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

## Future Roadmap

### Phase 1: Core Mobile ✅
- [x] Focus Mode Checklist
- [x] Offline mutations
- [x] Photo capture
- [x] Signature pad

### Phase 2: Report Lifecycle
- [ ] Create new report flow
- [ ] Report view (read-only)
- [ ] PDF generation
- [ ] Report archive with search

### Phase 3: Data Management
- [ ] Service points editor
- [ ] Product type management
- [ ] Excel import/export

### Phase 4: Team Features
- [ ] Multi-technician support
- [ ] Report assignment
- [ ] Admin dashboard

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

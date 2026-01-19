# Project Summary: Rapport PWA

## Overview
**Rapport PWA** is a professional field service reporting application designed for heavy machinery technicians. It enables technicians to perform equipment inspections, generate detailed service reports, and manage field data—even in offline or challenging environments.

The applications is built with a "Field-First" design philosophy:
- **Dark Mode Default**: Optimized for battery life and low-light environments (basements, server rooms).
- **Mobile Optimized**: Large touch targets and specialized "Focus Mode" for checklists.
- **Offline Capable**: Full functionality without internet, syncing when connection is restored.

---

## Technical Architecture

### Core Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: Better Auth (with Organization/Multi-tenancy support)
- **State Management**: TanStack Query (managing server state & offline mutations)
- **UI Component**: Shadcn UI + Tailwind CSS
- **File Storage**: Vercel Blob (Photos, Signatures, PDF assets)

### Key Libraries
- **PDF Generation**: `@react-pdf/renderer` (Client-side generation)
- **Excel Handling**: `xlsx` (Import/Export service points)
- **Drag & Drop**: `@dnd-kit` (Ordering service points)
- **PDF Parsing**: `pdf-parse` (Ingesting van inventory lists)

---

## Implemented Functionality

### 1. Essentials & Authentication
- **User Authentication**: Login, Signup, and Invitation flows configured.
- **Organization Support**: Multi-tenancy support allowing users to be members of organizations with specific roles (Owner, Admin, Technician).
- **Team Management**: Admin dashboard to manage members, invite users via link/email, and view team statistics.

### 2. Dashboard & Navigation
- **Premium Dashboard**: Visual hero section with "Live Data" visualization (simulated).
- **Statistics**: Quick view of daily activity, sync status, and pending uploads.
- **Responsive Shell**: Glassmorphism sidebar for desktop, optimized bottom navigation for mobile.

### 3. Reporting Workflow
- **Report Creation**: Wizard-style flow starting with Customer & Equipment selection.
- **Focus Mode Checklist**:
    - Distraction-free mobile interface.
    - One check at a time.
    - Large "Thumb-Friendly" status buttons (OK, Should Fix, Must Fix).
    - Photo capture per checkpoint (stored in Vercel Blob).
- **Report Completion**:
    - Summary view.
    - Digital signature capture.
    - AI-ready structure.

### 4. Data Management
- **Customer & Equipment**:
    - Manage customer registry.
    - Track persistent equipment history per customer.
- **Service Points (Data Editor)**:
    - Master data management for inspection templates.
    - Drag-and-drop ordering of categories and points.
    - Excel bulk import/export.
- **Van Inventory**:
    - Upload PDF packing lists/invoices.
    - Parse and track inventory sessions.
    - Consume parts directly within reports.

### 5. Output & Archives
- **PDF Reports**: Professional, branded PDF generation with photos and equipment history.
- **Report Archive**: Searchable history of all reports with status filters.
- **Offline Sync**: Visual indicators for sync status (Synced / Saved to Device / Offline).

---

## Database Schema (Prisma)

The application uses a relational schema centered around **Reports** and **Organizations**.

### Core Domain
- **Report**: The central entity, linked to Author, Organization, and Customer.
- **ReportEquipment**: Specific equipment instances serviced in a report.
- **ChecklistResult**: Individual inspection points with Status, Value, Comment, and Media (Photos).

### Master Data
- **ServicePoint**: Templates for what to inspect (Category, Product Type, Text).
- **Customer**: Persistent client records.
- **CustomerEquipment**: The "Asset Twin" that persists between reports.

### Inventory
- **VanInventory**: Session-based inventory tracking.
- **ReportPart**: Link table for parts consumed in a specific report.

---

## Roadmap & Future Goals

### Immediate Focus
- **Verification**: End-to-end testing of Customer → Equipment → Report flow.
- **Refinement**: Tuning PDF parsing for varied supplier invoice formats.

### Planned Features (Phase 5+)
- **AI Integration**: Auto-generate "Professional Conclusion" summaries based on checklist results and comments.
- **Customer Portal**: Secure, view-only links for customers to view their report history.
- **Push Notifications**: Notify technicians of new assignments or urgent service requests.
- **Advanced Inventory**: Deeper integration with ERP systems or manual stock adjustments.

# Rapport PWA - Project Summary

## Overview
**Rapport PWA** is a specialized field service reporting application built for heavy machinery technicians. It focuses on offline capabilities, rapid data entry, and professional PDF output. The application is designed to be a "Digital Toolbox" — reliable, fast, and purpose-built for the field.

## Project Purpose
To replace manual paper/excel-based reporting with a robust, digital workflow that:
1.  **Standardizes Reporting:** Ensures consistent data collection via templates.
2.  **Works Offline:** Fully functional without internet connectivity.
3.  **Automates Output:** Generates professional PDFs instantly.
4.  **Tracks History:** Maintains a digital twin of customer equipment history.

---

## Technical Architecture

### Core Stack
*   **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
*   **Database:** PostgreSQL
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Authentication:** [Better Auth](https://better-auth.com/) (with Organization/Multi-tenancy support)
*   **State Management:** TanStack Query (Server State) + React Context (Local State)
*   **UI:** Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)

### Key Libraries
*   **PDF Generation:** `@react-pdf/renderer` (Client-side generation for offline support)
*   **Data Import/Export:** `xlsx`
*   **Drag & Drop:** `@dnd-kit/core` (Service Point ordering)
*   **Date Handling:** `date-fns`

---

## Implemented Functionality

### 1. Authentication & Multi-Tenancy
*   **Organization-Based Access:** Users belong to organizations with specific roles (Owner, Admin, Technician).
*   **Invitation System:** Admins can invite new members via email.
*   **Secure Session Management:** Powered by Better Auth with persistent sessions.

### 2. Dashboard
*   **Live Statistics:** Real-time view of reports created, synced, and active members.
*   **Recent Activity:** Quick access to the latest reports.
*   **Admin Tools:** specialized dashboard for team management (admins only).

### 3. Reporting Workflow
The core value proposition is the streamlined reporting process:
1.  **Report Creation:** Wizard to select Customer, SO Number, and Equipment.
2.  **Equipment Management:**
    *   Add ad-hoc equipment or select from customer history.
    *   Track running hours, serial numbers, and product types.
3.  **Checklist Execution:**
    *   **Focus Mode:** Distraction-free interface for mobile.
    *   **Status Tracking:** OK / Should Fix / Must Fix / N/A.
    *   **Photo Evidence:** Capture and attach photos to specific checklist items.
4.  **Parts & Consumption:** Track parts used from Van Inventory or ad-hoc entry.
5.  **Completion & Signature:** Digital signature capture and AI-assisted summary generation.

### 4. Master Data & Templates
*   **Service Points:** Configurable templates for inspections (Category -> Question).
*   **Van Inventory:** Import parts lists from PDF invoices to track stock.
*   **Customer Registry:** Centralized database of clients and their assets.

### 5. Output
*   **PDF Generation:** High-fidelity, branded PDF reports generated instantly in the browser.
    *   *Features:* Photo grid, color-coded status, finding summary, signature block.

---

## Data Model (Prisma Schema Highlights)

### Core Domain
*   **`Report`**: The central artifact. Links specific `ReportInformation` (Customer, Date) to work performed.
*   **`ReportEquipment`**: Represents a specific machine being serviced.
*   **`ChecklistResult`**: The individual inspection data point (Status, Comment, Value, Photos).

### Persistence Links
*   **`CustomerEquipment`**: The "Asset Twin". ReportEquipment links here to build log history over time.
*   **`VanInventory`**: Tracks parts available for consumption.

---

## Future Goals & Roadmap

### Immediate (Phase 1 Refinement)
- [x] **PDF Layout Fixes**: Ensure reliable rendering of footers and page breaks (Recently Completed).
- [ ] **End-to-End Verification**: rigorous testing of the full Customer -> Equipment -> Report flow.
- [ ] **Assignment Logic**: Allow admins to assign reports to specific technicians via list view.

### Phase 2: Intelligence & Integration
- [ ] **AI Summaries**: Use LLMs to generate "Professional Conclusion" text based on checklist failures.
- [ ] **Customer Portal**: View-only links for clients to see their service history.
- [ ] **ERP Integration**: Two-way sync with accounting/stock systems.

### Phase 3: Advanced Field Features
- [ ] **Offline Maps**: Route planning and customer location visualization.
- [ ] **Asset QR Codes**: Scan equipment tags to instantly open history/new report.

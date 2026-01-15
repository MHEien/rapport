# AGENTS.md

## 1. Project Context
**Name:** Rapport Gen
**Goal:** A "Field-First" PWA for heavy machinery technicians to document service jobs offline.
**Persona:** You are a Senior React Engineer and UX Specialist focused on "Thumb-Friendly" mobile interfaces.

## 2. Tech Stack (Strict)
- **Framework:** Next.js 16 (App Router)
- **Database:** Postgres via Prisma 7 (Schema: `/prisma/schema.prisma`)
- **Auth:** Better Auth
- **UI:** Shadcn/ui + Tailwind CSS + Framer Motion
- **Storage:** Vercel Blob
- **State:** TanStack Query (for offline mutations)

## 3. Operational Commands
The agent should use these to verify work:
- Start Dev: `bun dev`
- Database Push: `bunx prisma db push` (Do NOT use migrate dev unless asked)
- Studio: `bunx prisma studio`
- Lint: `bunx biome check`

## 4. Coding Standards
- **Components:** Use functional components. All inputs must be large (min 48px height) for gloved usage.
- **Data Fetching:** ALL writes must go through server actions (`/actions/*.ts`).
- **Error Handling:** Never fail silently. Use `sonner` toasts for user feedback.
- **Imports:** Use `@/` path aliases.

## 5. Critical Boundaries
- **NEVER** modify `schema.prisma` without explicitly asking for a "Schema Review" first.
- **NEVER** use `any` type in TypeScript.
- **NEVER** leave sensitive keys in code (use `process.env`).

## 6. Important Notes
- The app is a PWA and should work offline.
- The app is a mobile-first app and should be optimized for mobile and tablet devices.
- The app is a work-in-progress and should be updated frequently.
- Always refer to the `AGENTS.md` file for the latest information.
- Always refer to the docs folder for previous progress logs and information.
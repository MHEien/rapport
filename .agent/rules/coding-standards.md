---
description: Coding standards and patterns for Rapport Gen components and data handling
---

# Coding Standards

## Components
- Use **functional components** only
- All inputs must be **large touch targets** (min 48px height) for gloved usage
- Mobile-first, "Thumb-Friendly" interfaces

## Data Fetching
- **ALL writes** must go through server actions (`/src/lib/actions/*.ts`)
- Use TanStack Query for read operations and offline mutations

## Error Handling
- Never fail silently
- Use **sonner** toasts for user feedback
- Log errors appropriately for debugging

## Imports
- Use `@/` path aliases for all imports
- Keep imports sorted (Biome will enforce this)

## TypeScript
- **NEVER** use `any` type
- Use proper type definitions from Prisma client

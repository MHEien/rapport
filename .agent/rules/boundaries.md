---
description: Critical restrictions and boundaries that must never be violated
---

# Critical Boundaries

## Schema Changes
- **NEVER** modify `prisma/schema.prisma` without explicitly asking for a "Schema Review" first
- Always use `bunx prisma db push` (not `migrate dev`) unless specifically asked

## Security
- **NEVER** leave sensitive keys in code
- Always use `process.env` for secrets
- Keep `.env` files out of git

## Type Safety
- **NEVER** use `any` type in TypeScript
- Use proper type inference where possible

## PWA Requirements
- The app must work **offline**
- All mutations must queue when offline and sync when online
- Sync status must be visible to users

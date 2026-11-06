---
description: Create and apply a Prisma migration for schema changes
argument-hint: <migration-name>
---
Review the diff of `prisma/schema.prisma`, then run `npx prisma migrate dev --name $ARGUMENTS`. Report the generated SQL and confirm `npx prisma migrate status` is clean.

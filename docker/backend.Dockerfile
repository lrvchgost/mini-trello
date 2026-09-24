# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base: Alpine + OpenSSL (required by the Prisma query engine) + pnpm.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache openssl && corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------
# Dependencies: install only the backend workspace and its dependencies.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile --filter @min-trello/backend...

# ---------------------------------------------------------------------------
# Build: compile shared contracts, generate the Prisma client (musl target)
# and compile the NestJS app.
# ---------------------------------------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @min-trello/shared build \
 && pnpm --filter @min-trello/backend exec prisma generate \
 && pnpm --filter @min-trello/backend build

# ---------------------------------------------------------------------------
# Runtime: non-root user, no build tools, entrypoint applies migrations + seed.
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PATH="/app/apps/backend/node_modules/.bin:${PATH}"

COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh \
 && addgroup -S nodejs -g 1001 \
 && adduser -S nestjs -u 1001 -G nodejs

# Workspace layout is preserved so pnpm symlinks keep resolving.
COPY --chown=nestjs:nodejs --from=build /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=build /app/package.json ./package.json
COPY --chown=nestjs:nodejs --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=nestjs:nodejs --from=build /app/tsconfig.base.json ./tsconfig.base.json

COPY --chown=nestjs:nodejs --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=nestjs:nodejs --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --chown=nestjs:nodejs --from=build /app/packages/shared/node_modules ./packages/shared/node_modules

COPY --chown=nestjs:nodejs --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --chown=nestjs:nodejs --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --chown=nestjs:nodejs --from=build /app/apps/backend/dist ./apps/backend/dist
# src is needed by `ts-node prisma/seed.ts` (imports BCRYPT_ROUNDS from src).
COPY --chown=nestjs:nodejs --from=build /app/apps/backend/src ./apps/backend/src
COPY --chown=nestjs:nodejs --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --chown=nestjs:nodejs --from=build /app/apps/backend/tsconfig.json ./apps/backend/tsconfig.json

USER nestjs
WORKDIR /app/apps/backend
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["backend-entrypoint.sh"]

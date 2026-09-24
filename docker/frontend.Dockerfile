# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base: Node + pnpm.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------
# Dependencies: install only the frontend workspace and its dependencies.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile --filter @min-trello/frontend...

# ---------------------------------------------------------------------------
# Build: Vite bakes VITE_* at build time (runtime env would not work), so they
# are injected as build args. Production uses same-origin /api via edge nginx.
# ---------------------------------------------------------------------------
FROM deps AS build
ARG VITE_API_URL=/api
ARG VITE_WS_URL=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/frontend apps/frontend
RUN pnpm --filter @min-trello/shared build \
 && pnpm --filter @min-trello/frontend build

# ---------------------------------------------------------------------------
# Runtime: nginx serves the static SPA with history-API fallback.
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runner
COPY docker/frontend-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

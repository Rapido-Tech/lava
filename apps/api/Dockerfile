# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN cd apps/api && bun run build

# Runtime: plain Node.js, not Bun. This server's CPU exposes no AVX at all
# (QEMU virtual CPU, a hypervisor-level limitation) and Bun's JS engine
# segfaults unconditionally on it regardless of base image — glibc vs musl
# made no difference. Node runs fine here (same pattern already used by
# wazap-server/connectr-backend on this host).
FROM node:20-alpine AS runner
WORKDIR /app
# bun installs into a central node_modules/.bun store with the per-workspace
# node_modules holding symlinks into it — both layers are needed or the
# symlinks in apps/api/node_modules dangle.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000

CMD ["node", "dist/index.js"]

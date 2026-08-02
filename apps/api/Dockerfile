# syntax=docker/dockerfile:1
# glibc build, not -alpine: the musl/Alpine Bun build segfaults on hosts
# whose CPU lacks AVX (seen on the Dokploy server) — glibc's baseline
# codepath handles no-AVX correctly.
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile

FROM deps AS runner
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]

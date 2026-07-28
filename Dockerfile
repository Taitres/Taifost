FROM node:22 AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=marlin-shiro-pnpm,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=marlin-shiro-pnpm,target=/pnpm/store \
  pnpm install --offline --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app .

ARG NEXT_PUBLIC_API_URL=/api/v3
ARG NEXT_PUBLIC_GATEWAY_URL=
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @shiro/web build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=2323

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl fontconfig fonts-noto-cjk \
  && fc-cache -f \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 2323
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:2323/robots.txt > /dev/null || exit 1

CMD ["node", "apps/web/server.js"]

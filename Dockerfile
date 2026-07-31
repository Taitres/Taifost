FROM node:22-bookworm-slim AS base

ARG DEBIAN_MIRROR=http://deb.debian.org/debian
ARG DEBIAN_SECURITY_MIRROR=http://deb.debian.org/debian-security
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN sed -i \
  -e "s|http://deb.debian.org/debian-security|${DEBIAN_SECURITY_MIRROR}|g" \
  -e "s|http://deb.debian.org/debian|${DEBIAN_MIRROR}|g" \
  /etc/apt/sources.list.d/debian.sources \
  && corepack enable

FROM base AS builder
RUN --mount=type=cache,id=marlin-shiro-apt,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,id=marlin-shiro-apt-lists,target=/var/lib/apt/lists,sharing=locked \
  apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git g++ make python3
WORKDIR /app
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY patches ./patches
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN --mount=type=cache,id=marlin-shiro-pnpm,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store \
  && NPM_CONFIG_REGISTRY="$NPM_REGISTRY" pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=marlin-shiro-pnpm,target=/pnpm/store \
  CI=true pnpm install --offline --frozen-lockfile
COPY . .

ARG NEXT_PUBLIC_API_URL=/api/v3
ARG NEXT_PUBLIC_GATEWAY_URL=
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @shiro/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=2323

RUN --mount=type=cache,id=marlin-shiro-apt,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,id=marlin-shiro-apt-lists,target=/var/lib/apt/lists,sharing=locked \
  apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl fontconfig fonts-noto-cjk \
  && fc-cache -f

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 2323
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:2323/robots.txt > /dev/null || exit 1

CMD ["node", "apps/web/server.js"]

FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY --from=deps /app .

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
ENV NEXT_SHARP_PATH=/usr/local/lib/node_modules/sharp

RUN apk add --no-cache curl fontconfig font-noto font-noto-cjk \
  && npm install -g --arch=x64 --platform=linux sharp \
  && fc-cache -f

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 2323
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:2323/robots.txt > /dev/null || exit 1

CMD ["node", "apps/web/server.js"]

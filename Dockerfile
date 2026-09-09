# Install dependencies only when needed
FROM oven/bun:1.2.19-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM deps AS builder
WORKDIR /app
COPY . .
# The only consumer of `.next/standalone`; next.config.js emits it on request.
ENV NEXT_OUTPUT_STANDALONE=1
RUN bun run build

# 3. Production image, copy all the files and run next
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public/
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static

USER nextjs

CMD node server.js
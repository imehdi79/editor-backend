# syntax=docker/dockerfile:1

# ---- Builder ----
# Bun is the project's package manager (bun.lock). Install + build here, then
# hand the compiled output to a slim Node runtime.
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install dependencies against the committed lockfile for reproducible builds.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Generate the Prisma client before the Nest build (schema only — no DB needed).
COPY prisma ./prisma
RUN bunx prisma generate

# Compile TypeScript -> dist/ (nest build).
COPY . .
RUN bun run build

# ---- Runner ----
# Plain Node runtime: no bun, no source. We keep the full node_modules from the
# builder so the Prisma CLI is available at startup for `migrate deploy`.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 8787

# Apply pending migrations, then start the server. `migrate deploy` is the
# production-safe, non-interactive variant (no schema drift, no prompts).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]

FROM node:18-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy lockfile and configs
COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
# Copy other packages package.json files if needed for lock file resolution
# (Will build workspace environment, then copy app source and build)

# For scaffolding we create a simple placeholder container build
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "start"]

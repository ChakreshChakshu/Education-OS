FROM node:18-alpine AS base

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json turbo.json ./
COPY apps/worker/package.json ./apps/worker/

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter worker build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json

CMD ["npm", "run", "start"]

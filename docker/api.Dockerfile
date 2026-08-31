FROM node:18-alpine AS base

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 4000
CMD ["npm", "run", "start"]

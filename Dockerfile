FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY prisma/schema.postgresql.prisma prisma/schema.prisma

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY prisma/schema.postgresql.prisma prisma/schema.prisma
COPY prisma/seed.ts prisma/seed.ts
COPY server ./server
COPY tsconfig.json ./
COPY index.html ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss 2>&1; echo 'DB migrated. Starting server...'; exec ./node_modules/.bin/tsx server/index.ts"]

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Use PostgreSQL schema for production build
COPY prisma/schema.postgresql.prisma prisma/schema.prisma

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma/schema.postgresql.prisma prisma/schema.prisma
COPY prisma/seed.ts prisma/seed.ts
COPY server ./server
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate || true && npx tsx server/index.ts"]

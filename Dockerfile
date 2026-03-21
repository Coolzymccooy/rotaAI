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
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma/schema.postgresql.prisma prisma/schema.prisma
COPY prisma/seed.ts prisma/seed.ts
COPY server ./server

# Install tsx for seed script
RUN npm install tsx

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run prisma db push + seed on first boot, then start
CMD sh -c "npx prisma db push --skip-generate && node dist/server/index.js"

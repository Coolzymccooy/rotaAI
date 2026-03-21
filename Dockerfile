FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY prisma/schema.postgresql.prisma prisma/schema.prisma

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-slim

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

CMD ["sh", "-c", "npx prisma db push --skip-generate 2>&1; echo 'DB ready. Starting server on port 3000...'; exec node --import tsx server/index.ts 2>&1"]

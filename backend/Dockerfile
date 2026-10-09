# ============================================================
#  Multi-stage production build
#  Stage 1 (builder): dependencies install + Prisma client generate
#  Stage 2 (runner) : slim, non-root, production runtime
# ============================================================

# ---- Stage 1: builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Pehle sirf package files copy karte hain — isse `npm ci` ek alag layer mein
# cache hota hai (source change par dobara install nahi chalta)
COPY package*.json ./
RUN npm ci

# Prisma client generate (schema ke saath) — runtime ke liye zaroori.
# `npm ci` ke postinstall se generate ki guarantee nahi hoti (schema absent),
# isliye explicit generate karte hain.
COPY prisma ./prisma
RUN npx prisma generate

# Baaki source copy karo (.dockerignore se node_modules/.git/.env/tests excluded)
COPY . .

# ---- Stage 2: runner ----
FROM node:22-alpine

ENV NODE_ENV=production

# Non-root user — container root user se nahi chalna chahiye (security best practice).
# root user par chalne se agar app compromise ho jaye toh attacker ko poora container
# ka root access mil jata hai; non-root se blast radius chhota hota hai.
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

WORKDIR /app

# Sirf runtime ke liye zaroori files copy karo (builder stage se)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs

EXPOSE 5000

# Production command — direct node. `npm run dev` (nodemon) sirf development ke liye hai.
CMD ["node", "src/server.js"]

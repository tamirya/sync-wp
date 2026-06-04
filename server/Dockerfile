# ── Build stage (compile TypeScript + dev tooling) ──────────────────────────
FROM node:18-alpine AS common-build-stage

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

# ── Development ─────────────────────────────────────────────────────────────
FROM common-build-stage AS development-build-stage

ENV NODE_ENV=development

CMD ["npm", "run", "dev"]

# ── Production (runtime deps only — includes mysql2, sequelize, bcrypt, …) ───
FROM node:18-alpine AS production-build-stage

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=common-build-stage /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY scripts/copy-maplibre-worker.mjs ./scripts/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/public ./public
COPY . .
ARG NEXT_PUBLIC_MAPTILER_KEY=
ARG NEXT_PUBLIC_MAPTILER_STYLE=streets-v4
ARG NEXT_PUBLIC_CONTACT_EMAIL=privacidad@parkflow.example
ENV NEXT_PUBLIC_MAPTILER_KEY=$NEXT_PUBLIC_MAPTILER_KEY
ENV NEXT_PUBLIC_MAPTILER_STYLE=$NEXT_PUBLIC_MAPTILER_STYLE
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

FROM base AS worker
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
CMD ["npm", "run", "ingest:watch"]

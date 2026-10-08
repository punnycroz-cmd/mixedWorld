# ---------- Web build ----------
FROM node:20-bookworm-slim AS webbuild
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace @mixed-world/web --include-workspace-root

COPY apps/web apps/web
ENV NEXT_STANDALONE=1
RUN npm run build:web

# ---------- Runtime ----------
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# FastAPI service (runs on 127.0.0.1:8001 inside the container)
COPY apps/api/pyproject.toml apps/api/pyproject.toml
COPY apps/api/app apps/api/app
RUN pip3 install --no-cache-dir --break-system-packages ./apps/api

# Next.js standalone server
COPY --from=webbuild /repo/apps/web/.next-build/standalone ./
COPY --from=webbuild /repo/apps/web/.next-build/static ./apps/web/.next-build/static
COPY --from=webbuild /repo/apps/web/public ./apps/web/public

COPY docker/start.sh ./start.sh
RUN chmod +x ./start.sh

ENV NODE_ENV=production \
    APP_ENV=production \
    NEXT_DIST_DIR=.next-build \
    NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001 \
    DATABASE_URL=sqlite:////data/mixedworld.db \
    WEB_BASE_URL=http://localhost:3000 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

EXPOSE 3000
CMD ["./start.sh"]

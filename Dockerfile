# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────────
# SuperAgents OS — multi-stage production Dockerfile
#
# Stage 1 (build): installs deps with legacy-peer-deps to bypass the
#                  typescript/madge peer-dep conflict, then runs
#                  `vite build`.
# Stage 2 (runtime): nginx-unprivileged (no root, listens on 8080
#                    which docker-compose maps to 80/443).
#
# Build args:
#   NGINX_CONFIG  — relative path under ./docker/ of the nginx config
#                    to bake into the image.  Defaults to nginx.conf
#                    (HTTP + reverse proxy for dev).  For prod with
#                    TLS, build with --build-arg NGINX_CONFIG=nginx-ssl.conf
#                    and mount certs via docker-compose.
# ────────────────────────────────────────────────────────────────

# ─── Stage 1: build ─────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# libstdc++ is required by sql.js native bindings used by Vite at
# build time.  git is needed for some npm packages with native git
# deps (e.g. esbuild postinstall).
RUN apk add --no-cache libc6-compat git

COPY package*.json ./
# `--legacy-peer-deps` is required: madge@8 expects typescript ^5.4.4
# while the project pins ~6.0.2.  See bugi2.md item #1.
RUN npm ci --legacy-peer-deps --no-fund

COPY . .
RUN npm run build

# ─── Stage 2: runtime (nginx-unprivileged) ──────────────────────
# nginx-unprivileged listens on 8080 by default; docker-compose maps
# it to host ports 80/443.  Running as non-root avoids the bind-to-80
# permission issue that broke the previous Dockerfile.
FROM nginxinc/nginx-unprivileged:1.27-alpine

ARG NGINX_CONFIG=nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx docker/${NGINX_CONFIG} /etc/nginx/conf.d/default.conf.template

# Healthcheck — pings the SPA root.  The app is client-side routed,
# so any 2xx/3xx is a green signal.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

COPY --chmod=755 docker/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 8080

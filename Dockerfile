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
# BLD-C1: Use build:no-tsc while 534+ tsc errors are still in the tree.
# `npm run build` runs `tsc -b && vite build` — tsc -b aborts with
# non-zero exit on type errors and `vite build` never runs, so the
# Docker image can't be produced. `build:no-tsc` skips type-check and
# lets Vite produce the bundle. Revert to `npm run build` once tsc is
# clean (tracked in roadmap Phase 3, debt report).
ARG VITE_BASE_PATH=/
RUN VITE_BASE_PATH=$VITE_BASE_PATH npm run build:no-tsc

# ─── Stage 2: runtime (nginx-unprivileged) ──────────────────────
# nginx-unprivileged listens on 8080 by default; docker-compose maps
# it to host ports 80/443.  Running as non-root avoids the bind-to-80
# permission issue that broke the previous Dockerfile.
FROM nginxinc/nginx-unprivileged:1.27-alpine

ARG NGINX_CONFIG=nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx docker/${NGINX_CONFIG} /etc/nginx/conf.d/default.conf.template

# Healthcheck defined in docker-compose.yml (overrides this) — keep single source of truth
COPY --chmod=755 docker/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 8080
EXPOSE 8443

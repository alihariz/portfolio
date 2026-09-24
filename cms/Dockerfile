# portfolio-cms
#
# Pin the base image by digest from docker-compose.yml, the same way every
# other image on the box is pinned:
#   build:
#     args:
#       NODE_IMAGE: node:24-alpine@sha256:<digest>
# The default below only applies to a bare `docker build`.
ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE}

WORKDIR /app

# The lockfile is honoured: npm ci installs exactly what was tested, including
# sharp's prebuilt musl binaries for Alpine.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server.js ./
COPY src ./src
COPY lib ./lib
COPY public ./public

ENV NODE_ENV=production PORT=8095 CONTENT_DIR=/content BACKUP_DIR=/backups
EXPOSE 8095
USER node

# No curl in the image; Node's own fetch does the job.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8095/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "server.js"]

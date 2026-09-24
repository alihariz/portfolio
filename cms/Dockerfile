FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js ./
COPY public ./public
ENV NODE_ENV=production CONTENT_DIR=/content PORT=8095
EXPOSE 8095
# Runs as node rather than root; the content volume is chowned in compose.
USER node
CMD ["node", "server.js"]

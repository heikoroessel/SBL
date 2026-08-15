# Stage 1: React-Frontend bauen
FROM node:20-slim AS client-builder
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Server + gebautes Frontend
FROM node:20-slim
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm install --omit=dev

COPY server/src ./src
COPY --from=client-builder /client/dist ./public

EXPOSE 8080

CMD ["npm", "start"]

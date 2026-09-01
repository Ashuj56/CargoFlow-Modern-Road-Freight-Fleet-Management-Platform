# Stage 1: Build stage
FROM node:20-alpine AS Build
WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS Runner
WORKDIR /app

RUN npm install -g serve && npm cache clean --force
COPY --from=Build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]

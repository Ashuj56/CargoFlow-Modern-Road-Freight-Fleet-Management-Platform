# Multi-stage production Dockerfile for CargoFlow Backend
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src/ ./src/
COPY index.js ./

RUN chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "index.js"]
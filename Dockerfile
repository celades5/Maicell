FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Nest app source
COPY backend/ ./

COPY definitions/ ./definitions/
COPY --from=frontend-build /frontend/dist/frontend/browser ./public


RUN npm run build

ENV NODE_ENV=production
ENV DEFINITIONS_DIR=/app/definitions
#ENV DB_SYNCHRONIZE=true

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
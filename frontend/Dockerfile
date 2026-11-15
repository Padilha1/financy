# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --ignore-scripts
COPY frontend frontend
ARG VITE_BACKEND_URL=/graphql
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build -w frontend

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY frontend/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080

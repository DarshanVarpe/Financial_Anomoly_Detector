# --- Build: install deps and produce static dist/ ---
FROM node:22-alpine AS builder
WORKDIR /app
# Install dependencies first (better layer cache)
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite inlines VITE_* at build time only

# Path where the SPA is mounted (ingress prefix). Must match trailing slash form, e.g. /fraudos-fe/
ARG BASE_PATH=/fraudos-fe/
ENV BASE_PATH=$BASE_PATH
RUN npm run build
# --- Run: static files only (small image, no Node in production) ---
FROM nginx:1.27-alpine AS runner
ARG VITE_API_URL=http://134.33.132.134/api
ENV VITE_API_URL=$VITE_API_URL
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]

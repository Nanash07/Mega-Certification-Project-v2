# ===== Stage 1: Build React (Vite) =====
FROM node:20-alpine AS build
WORKDIR /app

# Install deps (lebih konsisten kalau ada package-lock.json)
COPY package*.json ./
RUN npm ci

# Copy source & build
COPY . .
RUN npm run build

# ===== Stage 2: Serve with Nginx =====
FROM nginx:1.27-alpine

# Copy static build output
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config for SPA
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# dev: source is bind-mounted, node_modules stays in a named volume (see compose.yaml)
FROM deps AS dev
EXPOSE 5173
# reinstall only when package-lock.json changed since the volume was last filled
CMD ["sh", "-c", "cmp -s package-lock.json node_modules/.installed-lock || { npm ci --no-audit --no-fund && cp package-lock.json node_modules/.installed-lock; }; exec npm run dev"]

FROM deps AS build
COPY . .
RUN npm run build

# prod: static files + reverse proxy for /api, /admin, /static (Django)
FROM nginxinc/nginx-unprivileged:1.31-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

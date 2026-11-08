# Production image for Chopi - Menu (see docs/DEPLOY.md).
# Two stages: the build needs dev dependencies (Vite, esbuild, TypeScript),
# the running app only needs the production ones.

FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app

# Workspace manifests first, so dependencies are cached between builds.
COPY package.json package-lock.json ./
COPY packages/menu-core/package.json packages/menu-core/package.json
COPY packages/menu-renderer/package.json packages/menu-renderer/package.json
COPY extensions/chopi-menu/package.json extensions/chopi-menu/package.json
RUN npm ci

COPY . .
# Builds the storefront bundles and the app (shared packages are bundled in).
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
# Generates the Prisma client, applies pending migrations, then serves.
CMD ["npm", "run", "docker-start"]

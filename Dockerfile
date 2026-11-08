FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY scripts ./scripts
COPY lib ./lib
COPY artifacts ./artifacts

RUN corepack enable && pnpm install --frozen-lockfile

WORKDIR /app/artifacts/api-server
RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]

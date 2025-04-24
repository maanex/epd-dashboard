FROM oven/bun:debian AS base
WORKDIR /app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy production dependencies and source code into final image
FROM base AS release

ENV GLIBC_VERSION=2.38-r0
RUN apt-get update && apt-get install -y \
  libc6 \
  fonts-dejavu \
  libfontconfig1

COPY --from=install /temp/prod/node_modules node_modules
RUN mkdir -p /app/credentials
COPY ./base /app/base
COPY ./assets /app/assets

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "base/index.ts" ]

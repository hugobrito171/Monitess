# BASE #
FROM node:20-alpine AS base

WORKDIR /app
ARG TARGETPLATFORM
ENV MONITESS_IMAGE=base
ENV MONITESS_RUNNING_IN_DOCKER=true

RUN \
  /bin/echo ">> installing dependencies" &&\
  apk update &&\
  apk --no-cache add \
    lsblk \
    mdadm \
    dmidecode \
    coreutils \
    util-linux \
    lm-sensors \
    speedtest-cli &&\
  corepack enable &&\
  if [ "$TARGETPLATFORM" = "linux/amd64" ] || [ "$(uname -m)" = "x86_64" ]; \
    then \
      /bin/echo ">> installing dependencies (amd64)" &&\
      wget -qO- https://install.speedtest.net/app/cli/ookla-speedtest-1.1.1-linux-x86_64.tgz \
        | tar xmoz -C /usr/bin speedtest; \
  elif [ "$TARGETPLATFORM" = "linux/arm64" ] || [ "$(uname -m)" = "aarch64" ]; \
    then \
      /bin/echo ">> installing dependencies (arm64)" &&\
      wget -qO- https://install.speedtest.net/app/cli/ookla-speedtest-1.1.1-linux-aarch64.tgz \
        | tar xmoz -C /usr/bin speedtest &&\
      apk --no-cache add raspberrypi; \
  elif [ "$TARGETPLATFORM" = "linux/arm/v7" ]; \
    then \
      /bin/echo ">> installing dependencies (arm/v7)" &&\
      wget -qO- https://install.speedtest.net/app/cli/ookla-speedtest-1.1.1-linux-armhf.tgz \
        | tar xmoz -C /usr/bin speedtest &&\
      apk --no-cache add raspberrypi; \
  else /bin/echo "Unsupported platform"; exit 1; \
  fi

# DEV #
FROM base AS dev

EXPOSE 3001
EXPOSE 3000

RUN /bin/echo ">> installing dependencies (dev)"
RUN apk --no-cache add git
RUN git config --global --add safe.directory /app

# BUILD #
FROM base AS build

ARG BUILDHASH
ARG VERSION

ENV NODE_ENV=production

RUN /bin/echo ">> installing dependencies (build)"
RUN apk update && apk --no-cache add git make clang build-base python3
RUN git config --global --add safe.directory /app
RUN /bin/echo "{\"version\":\"$VERSION\",\"buildhash\":\"$BUILDHASH\"}" > /app/version.json

COPY . ./

RUN \
  YARN_ENABLE_SCRIPTS=0 yarn install --immutable &&\
  yarn build:prod &&\
  node scripts/strip_package_json.js

# PROD #
FROM base AS prod

ENV NODE_ENV=production

EXPOSE 3001

COPY --from=build /app/version.json .
COPY --from=build /app/.yarn/releases .yarn/releases
COPY --from=build /app/.yarnrc.yml .yarnrc.yml
COPY --from=build /app/apps/server/dist server/dist
COPY --from=build /app/apps/view/dist view/dist
COPY --from=build /app/apps/cli/dist cli/dist
COPY --from=build /app/dist/package.json package.json

RUN YARN_ENABLE_SCRIPTS=0 yarn install

CMD ["node", "server/dist/index.cjs"]
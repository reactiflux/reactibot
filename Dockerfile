FROM node:16-alpine as build
WORKDIR /build/reactibot

RUN apk update && apk upgrade && \
    apk add --no-cache bash

COPY package.json yarn.lock ./

ENV YARN_CACHE_FOLDER=/cache/yarn
VOLUME /cache/yarn
RUN yarn

COPY tsconfig.json .eslint* .prettierignore ./
COPY src ./src
COPY scripts ./scripts

RUN yarn test
RUN yarn build

FROM node:16-alpine
WORKDIR /build/reactibot

ENV YARN_CACHE_FOLDER=/cache/yarn
COPY --from=build /cache/yarn /cache/yarn

COPY --from=build /build/reactibot/package.json /build/reactibot/yarn.lock ./
COPY --from=build /build/reactibot/dist dist

ENV NODE_ENV=production
RUN yarn

CMD ["yarn", "start"]

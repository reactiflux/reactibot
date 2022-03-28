FROM node:16-alpine
WORKDIR /build/reactibot

RUN apk update && apk upgrade && \
    apk add --no-cache bash

COPY package.json yarn.lock ./

RUN yarn

COPY tsconfig.json .eslint* .prettierignore ./
COPY src ./src
COPY scripts ./scripts

RUN yarn test
RUN yarn build

CMD ["yarn", "start"]

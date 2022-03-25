FROM node:16-alpine
WORKDIR /build/reactibot

RUN apk update && apk upgrade && \
    apk add --no-cache bash

COPY package.json yarn.lock ./

RUN yarn

COPY . .

RUN yarn build

CMD ["yarn", "start"]

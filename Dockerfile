FROM node:16-alpine
WORKDIR /build/reactibot

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

COPY package.json yarn.lock ./

RUN yarn

COPY . .

RUN yarn build

CMD ["yarn", "start"]

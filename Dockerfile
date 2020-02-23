FROM node:10-alpine
WORKDIR /var/scripts/reactibot

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

COPY package*.json ./

RUN npm install

COPY . .

RUN npm build

CMD ["npm", "run", "start"]
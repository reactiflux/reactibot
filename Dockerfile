FROM node:10-alpine
WORKDIR /var/scripts/reactibot

COPY package.json ./
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
RUN npm install
COPY . .
CMD ["npm", "run", "start"]
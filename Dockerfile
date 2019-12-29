FROM node:10-alpine
WORKDIR /var/scripts/reactibot

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git

COPY package.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start"]
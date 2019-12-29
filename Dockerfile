FROM node:10-alpine
WORKDIR /var/scripts/reactibot

COPY package.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start"]
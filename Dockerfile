FROM node:20-alpine as build
WORKDIR /build/reactibot

RUN apk add --no-cache poppler-utils

COPY package.json package-lock.json ./
RUN npm install --production=false

COPY tsconfig.json .eslint* .prettierignore ./
COPY src ./src

RUN npm run test
RUN npm run build

FROM node:20-alpine
WORKDIR /build/reactibot

ENV NODE_ENV=production

COPY --from=build /build/reactibot/node_modules /build/reactibot/node_modules
ADD package.json package-lock.json ./
RUN npm prune --production

COPY --from=build /build/reactibot/dist dist

CMD ["npm", "run", "start"]

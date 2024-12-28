FROM node:14-buster-slim AS build

RUN apt-get update && apt-get install -y git

WORKDIR /app
COPY package*.json ./
RUN npm install

WORKDIR /app/front
COPY front/package*.json ./
RUN npm install

WORKDIR /app
COPY . .
RUN npm run build
WORKDIR /app/front
RUN npm run build


FROM node:14-buster-slim AS runtime

RUN apt-get update && apt-get install -y git

# RUN apk --no-cache -U upgrade
RUN mkdir -p /app/front/build && mkdir -p /app/.ts-node && chown -R node:node /app
WORKDIR /app

COPY package*.json ./
USER node

RUN npm install --only=production
COPY --chown=node:node --from=build /app/front/build ./front/build
COPY --chown=node:node --from=build /app/.ts-node ./.ts-node
COPY --chown=node:node --from=build /app/device_descriptions_v1.3.0 ./device_descriptions_v1.3.0

EXPOSE 3000

ENTRYPOINT ["node", "/app/.ts-node/index.js"]


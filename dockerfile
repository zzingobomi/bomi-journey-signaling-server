FROM node:18

WORKDIR /bomi-journey-signaling-server
COPY . .
RUN yarn install
RUN yarn build

EXPOSE 25000
CMD ["yarn", "start"]
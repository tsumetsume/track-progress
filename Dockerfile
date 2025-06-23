FROM node:24

WORKDIR /app

COPY package*.json ./

CMD ["npm", "run", "dev"]
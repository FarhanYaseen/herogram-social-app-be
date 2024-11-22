FROM node:18

RUN apt-get update && apt-get install -y python3 make gcc g++

WORKDIR /app

COPY package*.json ./

RUN npm install bcrypt --build-from-source

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]

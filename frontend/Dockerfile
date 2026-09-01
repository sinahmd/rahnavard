FROM node:20-alpine
WORKDIR /app
RUN npm config set registry https://npm.arvancloud.ir/
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

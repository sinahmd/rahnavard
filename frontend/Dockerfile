FROM node:20-alpine

WORKDIR /app

# Use Arvan Cloud npm mirror for faster installs in Iran
RUN npm config set registry https://npm.arvancloud.ir/

# Build args for NEXT_PUBLIC_* vars
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Start the application (dev mode)
CMD ["npm", "run", "dev"]

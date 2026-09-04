FROM node:20-alpine

WORKDIR /app

# Build args for NEXT_PUBLIC_* vars
ARG NEXT_PUBLIC_API_URL=https://rahnavard.co/api/v1
ARG NEXT_PUBLIC_SITE_URL=https://rahnavard.co
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# npm registry: the Arvan Cloud mirror (npm.arvancloud.ir) returns 403 for
# some packages outside Iran, so the local dev image uses the same accessible
# China mirror (registry.npmmirror.com) as Dockerfile.prod. This file is
# local-only (see LOCAL_ONLY_FILES.txt) and never ships to production.
RUN npm config set registry https://registry.npmmirror.com/

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Start the application (dev mode)
CMD ["npm", "run", "dev"]

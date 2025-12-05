# Dockerfile
FROM node:20-bullseye

# Set working directory
WORKDIR /usr/src/app

# Copy package.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Expose port
EXPOSE 3000

# Start dev
CMD ["npm", "run", "start:dev"]

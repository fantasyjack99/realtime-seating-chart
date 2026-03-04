FROM node:22-bookworm-slim

# Create app directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install

# Bundle app source
COPY . .

# Build the frontend application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

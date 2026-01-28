FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY server.js .

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]

FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Only copy necessary files for serving
COPY dashboard/ ./dashboard/

# Install 'serve' package to serve static content
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Start serving the dashboard
CMD [ "serve", "-s", "dashboard", "-l", "3000" ]

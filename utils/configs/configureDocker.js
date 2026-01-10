const fs = require("fs");
const { logInfo } = require("../loggers/logInfo");
const { logSuccess } = require("../loggers/logSuccess");
const { createFile } = require("../userInput");

async function configureDocker(inputs) {
  logInfo("Generating Docker files...");

  const dockerfileContent = `
# ------------------ Stage 1: Build & Dependencies ------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies (Node dependencies and global tools like Prisma if needed)
# The 'production' flag ensures only production dependencies are installed if applicable.
# 'npm ci' is recommended for CI/CD/Docker builds instead of 'npm install'
RUN ${
    inputs.packageManager === "npm"
      ? "npm ci"
      : `${inputs.packageManager} install --frozen-lockfile`
  }

# Copy the rest of the application source code
COPY . .

# Build the NestJS application (if TypeScript is used)
RUN ${inputs.packageManager} run build

# ------------------ Stage 2: Production Runtime ------------------
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy production node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy built application and start scripts (dist and package.json)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Expose the application port (usually 3000 for NestJS)
EXPOSE 3000

# Run the application using the built files (production environment)
# Use 'start:prod' if available, otherwise fall back to 'start'
CMD [ "${inputs.packageManager}", "run", "start:prod" ]
`;
  await createFile({
    path: "Dockerfile",
    contente: dockerfileContent.trim(),
  });
  const dockerComposeContent = `
version: '3.8'

services:
  # Application Service (NestJS)
  app:
    build:
      context: .
      dockerfile: Dockerfile
    # Links the container to the internal network
    networks:
      - backend_network
    # Maps internal port 3000 (EXPOSE in Dockerfile) to external port 3000
    ports:
      - "3000:3000"
    # Mount .env file (for local dev, not recommended for prod)
    env_file:
      - .env
    # Restart policy
    restart: always
    # Wait for the DB to be ready (requires 'wait-for-it' or similar)
    depends_on:
      - db

  # Database Service (PostgreSQL - generic image for example)
  db:
    image: postgres:15-alpine
    container_name: ${inputs.projectName}_db
    networks:
      - backend_network
    environment:
      POSTGRES_USER: ${inputs.dbConfig.POSTGRES_USER || "postgres"}
      POSTGRES_PASSWORD: ${inputs.dbConfig.POSTGRES_PASSWORD || "secret"}
      POSTGRES_DB: ${inputs.dbConfig.POSTGRES_DB || "mydatabase"}
      # Optional: Set timezone
      TZ: Europe/Paris
    # For dev purposes: map DB port externally (optional)
    ports:
      - "5432:5432"
    # Persist database data
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

# Networks definition
networks:
  backend_network:
    driver: bridge

# Volumes definition
volumes:
  postgres_data:
`;

  await createFile({
    path: "docker-compose.yml",
    contente: dockerComposeContent.trim(),
  });

  logSuccess("Docker successfully configured with enhanced settings");
}

module.exports = { configureDocker };

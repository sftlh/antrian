# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=22.14.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory for all build stages.
WORKDIR /usr/src/app
RUN apk add --no-cache openssl tzdata
COPY --chown=node:node package*.json ./

################################################################################
# Create a stage for installing production dependecies.
FROM base AS deps

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage bind mounts to package.json and package-lock.json to avoid having to copy them
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
# Create a stage for building the application.
FROM deps AS build

# Download additional development dependencies before building, as some projects require
# "devDependencies" to be installed to build. If you don't need this, remove this step.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Create the cache directory and adjust permissions
RUN mkdir -p .next/cache/images && chown -R node:node .next
RUN mkdir -p public/uploads/ && chown -R node:node public/uploads

# Copy the rest of the source files into the image.
COPY . .
# Run the build script.
RUN npx prisma generate
# Compile seed script
WORKDIR /usr/src/app/prisma
RUN npx tsc seed.ts --module CommonJS --esModuleInterop --skipLibCheck --outDir ../prisma-seed
WORKDIR /usr/src/app
RUN npm run build

################################################################################
# Create a stage for running the application
FROM base AS final

# Use production node environment by default.
ENV NODE_ENV=production

# Run the application as a non-root user.
# USER node # Commented out to allow entrypoint script to receive signals or do root things if needed, but best practice is user node. 
# However, if we need to chown or run things, root might be needed temporarily. 
# Better: Set user at the end.

WORKDIR /usr/src/app

# Copy package.json so that package manager commands can be used.
COPY package.json .

# Copy production dependencies
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy built application and necessary config
COPY --from=build /usr/src/app/.next/standalone ./
COPY --from=build /usr/src/app/.next/static ./.next/static
COPY --from=build /usr/src/app/public ./public
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/prisma-seed/seed.js ./prisma/seed.js
COPY --from=build /usr/src/app/start.sh ./start.sh

# Ensure start.sh is executable
RUN chmod +x ./start.sh

# Switch to non-root user
USER node

# Expose the port that the application listens on.
EXPOSE 3003

# Configure entrypoint
ENTRYPOINT ["./start.sh"]

# Run the application.
CMD ["node", "server.js"]

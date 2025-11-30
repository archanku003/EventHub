# Multi-stage Dockerfile for EventHub (Vite + React + TypeScript)
# Builder: installs deps and builds the app
# Production: serves built assets with nginx (SPA fallback)

########################################
# Builder
########################################
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (only package files) for better caching
COPY package.json package-lock.json* ./

# If a lockfile exists, `npm ci` would be ideal — fallback to `npm install` otherwise
RUN if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit --progress=false; else npm install --no-audit --progress=false; fi

# Copy rest of the source
COPY . .

# Allow build-time injection of VITE_ variables (these are baked into the build)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

# Build the production bundle (Vite outputs to `dist` by default)
RUN npm run build


########################################
# Production image
########################################
FROM nginx:stable-alpine AS production

# Remove default nginx config and use our own to enable SPA fallback
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
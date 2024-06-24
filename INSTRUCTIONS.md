# Web Apps Deployment

1. You may need to update your `package.json` with the following block
   ```
   "scripts": {
      [...]
      "local-build": "prisma generate && prisma migrate deploy && next build",
      "production-build": "next build",
      "production-migrate": "prisma generate && prisma migrate deploy",
      "dev": "next dev",
      "start": "next start -H 0.0.0.0"
   }
   ```
2. Try to build and test your application locally with `npm run local-build`. This also creates
the schema/migrations in your DB. Keep in mind that you need `DATABASE_URL` and `DIRECT_URL` in `.env` file.
Use the following docker compose file to set up your testing db:
    ```yaml
   services:
    db:
        image: postgres:16.2-bookworm
        environment:
            POSTGRES_PASSWORD: "sosecret"
        ports:
            - "8000:5432"
   ```
   You have then `DATABASE_URL=postgres://postgres:sosecret@localhost:8000/postgres`
3. Prepare a `Dockerfile` your application:
   ```
   # Based on https://inmeta.medium.com/deploy-next-js-to-azure-3-effective-strategies-for-modern-developers-86a41c0f9d92
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   # Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   
   # Install dependencies based on the preferred package manager
   COPY package.json package-lock.json* ./
   RUN npm ci
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   ENV NEXT_TELEMETRY_DISABLED 1
   
   RUN npm run production-build
   
   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   
   COPY . .
   
   ENV NODE_ENV production
   ENV NEXT_TELEMETRY_DISABLED 1
   
   EXPOSE 3000
   ENV PORT 3000
   
   ENV HOSTNAME="0.0.0.0"
   CMD npm run production-migrate; npm start
   ```
   Don't forget excluding `.env*` files in the `.dockerignore`file
4. Build and run your image via `docker build -t myfancyapp --network=host . ` followed by
   `docker run -p 3000:3000 --network=host myfancyapp:latest`
5. Tag and push the image to your container registry
6. Create an Web App for your image
7. Set all needed Environment variables in your application
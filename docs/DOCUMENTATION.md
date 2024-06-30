# NextJS Azure

URL: https://mx-next-blog.azurewebsites.net/

## Steps

### Scripts der package.json anpassen

Die Scripts in der package.json müssen angepasst werden, damit die Applikation auf Docker gebuildet und gestartet werden kann.

```json
"scripts": {
    "local-build": "prisma generate && prisma migrate deploy && next build",
    "production-build": "next build",
    "production-migrate": "prisma generate && prisma migrate deploy",
    "dev": "next dev",
    "start": "next start -H 0.0.0.0"
  }
```

- `local-build`: Baut die Applikation für die lokale Entwicklung
- `production-migrate`: Für deployment -> Prisma client generieren und Production migrations ausführen
- `production-build`: Baut die Applikation für die Produktion
- `dev`: Startet die Applikation in der Entwicklungsumgebung
- `start`: Startet die Applikation in der Produktionsumgebung

### Dockerfile erstellen

Ein Dockerfile wird benötigt, um die Applikation in einem Container zu betreiben.

```Dockerfile
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
Das Dockerfile besteht aus mehreren Schritten:

- `base`: Der Basisimage, das die notwendigen Abhängigkeiten installiert in diesem Fall `node:18-alpine` für die Node.js Umgebung.
- `deps`: Installiert die Abhängigkeiten, die für die Applikation benötigt werden.
- `builder`: Kopiert die Dateien in den Container und baut die Applikation.
- `runner`: Laufzeitphase
- `ENV PORT 3000`: Der Port, auf dem die Applikation laufen soll.
- `CMD npm run production-migrate; npm start`: Startet die Applikation und generiert Prisma.

### dockerignore erstellen

In der `.dockerignore` Datei werden Dateien und Ordner definiert, die nicht in den Container kopiert werden sollen. In diesem fall .env

```
.env*

```

### Local Testing

Mithilfe einer Docker Compose Datei für eine Postgres Datenbank kann die Applikation lokal getestet werden.

```yaml
services:
  db:
    image: postgres:16.2-bookworm
    environment:
        POSTGRES_PASSWORD: "sosecret"
    ports:
        - "8000:5432"
```

"docker compose up" 

Für das lokale testbuilden und starten der Applikation wird folgende Befehle verwendet:

```bash
docker build . -t mx-next-blog --network=host
docker run -p 3000:3000 mx-next-blog -e "POSTGRES_PRISMA_URL=postgres://postgres:sosecret@localhost:8000/postgres" --network=host
```

### Fehlerbehebung

Es ergaben sich einige Fehler während des Testens. Einerseits musste das Buildtarget des clients in schema.prisma auf das folgende geändert werden:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

Des weitern musste ein teil der Applikation umgeschrieben werden, da GetStaticProps beim builden bereits die Datenbankverbindung aufbauen wollte. Dies wurde durch die folgende Änderung zu getServerSideProps in der index.tsx gelöst:

```typescript

export const getServerSideProps = async () => {
    let feed;
    
    try {
    feed = await prisma.post.findMany({
      include: {
        user: {
          select: { name: true },
        },
      },
    });
    }
    catch (error) {
        console.error(error);
    }

    feed.forEach((post) => {
        post.date = post.date.toISOString();
      }
      );

    return {
      props: { feed },
      revalidate: 10,
    };
};

```

## Azure Deployment

### Image in Azure Registry pushen

- Login in Azure Container Registry mit Admin User

```bash
docker login galahad.azurecr.io
```
- Docker image taggen

```bash
docker tag mx-next-blog:latest galahad.azurecr.io/web-apps/mx-next-blog:latest
```

- Docker image pushen

```bash

docker push galahad.azurecr.io/web-apps/mx-next-blog:latest
```

### Azure Web App mit Datenbank erstellen (Neue Methode)
- Azure Web App erstellen
- Azure Database for PostgreSQL Server aktivieren

- Neue App erstellen
![Step 1](./1.png)
- Publish auf Code wählen
![Step 2](./2.png)
- Runtime Stack auf NodeJS 18 oder 20 wählen
![Step 3](./3.png)
- Wenn nötig neuen Service Plan erstellen und datenbank aktivieren und auf customize. klicken.
![Step 4](./4.png)
- Auf PostgreSQL stellen und speichern.
![Step 5](./5.png)
- Nun wieder Publish auf Container wählen
![Step 6_1](./6_1.png)
- Sicher stellen, dass der haken noch gesetzt ist.
![Step 6_2](./6_2.png)
- Nun auf Azure Container Registry klicken und das zuvor gepushte Image auswählen.
![Step 7](./7.png)

- Neue GitHub Oauth App erstellen mit Callback URL auf Azure Web App Url
- Relevante Environment Variablen setzen in Azure Portal (Connection String, Github OAuth, Next Auth etc.)
- Azure Private DNS Integration in Datenbank aktivieren

## ???
## Profit!
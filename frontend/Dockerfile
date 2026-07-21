# 1. Basis-Image: Node.js 20 (Alpine = schlanke Linux-Version)
FROM node:20-alpine

WORKDIR /app

# 2. Zuerst nur package.json kopieren, damit npm install gecached wird
COPY package*.json ./
RUN npm install

# 3. Restlichen Code kopieren
COPY . .

# 4. Next.js Dev-Server läuft auf 3001
EXPOSE 3001

# 5. Dev-Server mit Hot-Reload starten
CMD ["npm", "run", "dev"]

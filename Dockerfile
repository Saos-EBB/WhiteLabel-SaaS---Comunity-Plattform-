# 1. Basis-Image: Node.js 20 (Alpine = schlanke Linux-Version, ~50MB statt ~900MB)
FROM node:20-alpine

# 2. Arbeitsverzeichnis im Container setzen
#    Alle folgenden Befehle laufen in diesem Ordner
WORKDIR /app

# 3. Zuerst NUR package.json kopieren (nicht den ganzen Code)
#    Warum? Docker cached jeden Schritt - wenn sich package.json nicht ändert,
#    wird npm install nicht nochmal ausgeführt = schnellere Builds
COPY package*.json ./

# 4. Dependencies installieren
RUN npm install

# 5. Jetzt den restlichen Code kopieren
COPY . .

# 6. Port freigeben (NestJS läuft auf 3000)
EXPOSE 3000

# 7. Dev-Server starten mit Hot-Reload
CMD ["npm", "run", "start:dev"]
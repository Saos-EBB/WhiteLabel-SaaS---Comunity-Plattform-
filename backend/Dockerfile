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
RUN chmod +x docker-entrypoint.sh

# 6. Port freigeben (NestJS läuft auf 3000)
EXPOSE 3000

# 7. Demo-Daten seeden (idempotent) und Dev-Server mit Hot-Reload starten
#    Ueber "sh" statt direkt als relativer Pfad, weil das Basis-Image sein
#    eigenes ENTRYPOINT docker-entrypoint.sh mitbringt, das per `command -v`
#    prueft ob CMD ein bekannter Befehl ist — wegen eines ash/dash-Bugs
#    (https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=874264) erkennt das
#    einen relativen Pfad wie "./docker-entrypoint.sh" nicht zuverlaessig und
#    faellt auf `node ./docker-entrypoint.sh` zurueck, was crasht.
CMD ["sh", "./docker-entrypoint.sh"]
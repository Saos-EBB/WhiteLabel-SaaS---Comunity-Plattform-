---
name: commit
description: Liest alle uncommitted Änderungen der aktuellen Session, generiert eine sinnvolle Commit-Message, updated den Changelog in der README.md und commitet beides. Verwende diesen Skill immer wenn der User "/commit" eingibt oder sagt "commite die Änderungen", "stage alles", "was haben wir heute gemacht" oder ähnliches.
---

# Commit Skill

Fasst alle uncommitted Änderungen zusammen, schreibt einen Changelog-Eintrag in die README.md und erstellt einen sauberen Commit — kein Push.

## Schritte

### 1. Änderungen lesen
```bash
git diff HEAD
git status
```
Lies den Output. Verstehe was sich geändert hat — welche Dateien, grob was drin steht.

### 2. Commit-Message generieren
Basierend auf den Änderungen: eine kurze, präzise Commit-Message im Format:
```
<type>: <was wurde gemacht>
```
Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`

Beispiele:
- `feat: add beef voting endpoint`
- `fix: correct Art.9 consent trigger`
- `docs: update README changelog`

### 3. README.md Changelog updaten
Öffne `README.md` im Root. Suche den Changelog-Abschnitt (oder erstelle ihn wenn nicht vorhanden):

```markdown
## Changelog

### YYYY-MM-DD
- <was wurde gemacht, 1-3 Bullet Points>
```

Füge einen neuen Eintrag **oben** im Changelog ein. Datum = heute. Inhalt = die wichtigsten Änderungen in einfachen Worten, kein Tech-Jargon wenn vermeidbar.

### 4. Alles commiten
```bash
git add -A
git commit -m "<generierte commit message>"
```

## Wichtig
- **Kein `git push`** — der User pusht selbst wenn er bereit ist
- Wenn `git diff HEAD` leer ist → dem User sagen dass nichts zu commiten ist
- Wenn keine README.md existiert → nur commiten, keinen Changelog erstellen
- Wenn kein Changelog-Abschnitt in der README existiert → am Ende der README anfügen

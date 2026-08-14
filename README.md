# Systemische Business Landkarte – Plattform

Webapplikation für das Systemischer-Kompass-Programm: digitale Transferbögen,
eine Business Landkarte pro Organisation, Aufgabenverwaltung und Gamification.

## Architektur

- **server/** – Node.js + Express API, PostgreSQL als Datenbank
- **client/** – React + Vite Frontend

Zwei Rollen:
- **Admin** (du): verwaltet Organisationen, Bearbeiter, Lerngruppen, Module und Freigaben
- **Org-User** (Geschäftsführer/Prokuristen etc.): bearbeiten die Hausaufgaben ihrer Organisation

## Lokale Entwicklung

### Voraussetzungen
- Node.js 20+
- Eine PostgreSQL-Datenbank (lokal oder z. B. eine kostenlose Railway/Supabase-Instanz)

### Einrichtung

```bash
npm run install:all

# Server-Umgebungsvariablen
cp server/.env.example server/.env
# server/.env editieren: DATABASE_URL auf deine Postgres-Instanz setzen

# Schema anlegen
cd server && npm run migrate

# 16 Lektionen, Felder, Perspektiven und den ersten Admin einspielen
npm run seed
cd ..

# Server starten (Port 4000)
npm run dev:server

# In einem zweiten Terminal: Client starten (Port 5173)
npm run dev:client
```

Öffne `http://localhost:5173`. Login mit den in `server/.env` hinterlegten
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (Default: `heiko@systemischer-kompass.de`
/ `aendern123` – **bitte nach dem ersten Login ändern**, aktuell gibt es dafür
noch keine eigene UI; das kannst du direkt in der Datenbank per Hash aktualisieren
oder mich bitten, eine Admin-Passwort-Änderungsseite zu ergänzen).

## Deployment auf Railway

1. Neues Railway-Projekt anlegen, **PostgreSQL**-Plugin hinzufügen
2. Zwei Services aus diesem Repo anlegen (oder einen Service mit zwei Deploy-Konfigurationen):
   - **server**: Root-Verzeichnis `server/`, Start-Command `npm start`
   - **client**: Root-Verzeichnis `client/`, Build-Command `npm run build`,
     als statischer Dienst (z. B. über `serve` oder Railways Static-Site-Option) ausliefern
3. Umgebungsvariablen beim **server**-Service setzen:
   - `DATABASE_URL` – von Railway automatisch bereitgestellt, wenn Postgres im selben Projekt liegt
   - `JWT_SECRET` – langer zufälliger String
   - `CLIENT_ORIGIN` – die öffentliche URL deines Client-Services
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`
4. Nach dem ersten Deploy einmalig in der Railway-Konsole (Shell des server-Service) ausführen:
   ```bash
   npm run migrate
   npm run seed
   ```
5. Beim **client**-Service `VITE_API_PROXY` bzw. die tatsächliche API-Basis-URL
   entsprechend konfigurieren, falls Client und Server nicht unter derselben Domain laufen
   (aktuell ist der Vite-Dev-Proxy auf `localhost:4000` fest verdrahtet – für Produktion
   empfiehlt sich ein Reverse-Proxy oder eine `VITE_API_BASE`-Umgebungsvariable, die ich
   auf Wunsch ergänze).

## Was ist bereits enthalten

- Vollständiges Datenmodell für Admin/Organisationen/Bearbeiter/Lerngruppen/Module/
  Postits/To-Dos/Punkte (`server/src/db/schema.sql`)
- Alle **16 Lektionen** des Programms vollständig befüllt (Titel, Kurzbeschreibung,
  alle Pflicht-/Wahlfelder mit den Original-Reflexionsfragen aus dem Transferbogen) –
  automatisch aus den hochgeladenen Dokumenten extrahiert, siehe `server/src/seed/`
- Rechtekonzept: Admin sieht alles, jede Organisation nur ihre eigene Landkarte
- Postit-Workflow mit Reflexions- und Umsetzungsebene, To-Dos mit Priorität/Termin/
  Zuständigkeit/Bewertung
- Punktesystem und Fortschrittsvergleich innerhalb der Lerngruppe
- Zwei Pinnwände (Organisation, Lerngruppe) für geteilte Erfolgsgeschichten

## Bewusst noch offen (siehe Gespräch)

- **E-Mail-Versand / Erinnerungen** – im MVP ausgeklammert, wie besprochen
- **Admin-Oberfläche zum Anlegen neuer Module (17+) über ein Formular** – Backend-Route
  (`POST /api/admin/modules` + `/api/admin/modules/:id/tasks`) existiert bereits,
  die UI dafür ist noch nicht gebaut (aktuell nur Anzeige/Freigabe bestehender Module)
- **Admin-Self-Service für eigenes Passwort ändern**
- Automatisierte Tests

## Nützliche Befehle

```bash
npm run seed --prefix server   # Referenzdaten & 16 Module erneut einspielen (idempotent)
npm run build:client           # Produktions-Build des Frontends
```

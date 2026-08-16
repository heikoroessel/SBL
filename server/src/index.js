import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import 'express-async-errors';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import orgRoutes from './routes/org.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/org', orgRoutes);

// Zentrales Error-Handling für /api-Routen. Dank express-async-errors werden auch Fehler aus
// async-Routen (z.B. fehlgeschlagene Datenbankabfragen) hier zuverlässig abgefangen, statt dass
// die Anfrage stillschweigend hängen bleibt.
app.use('/api', (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.userMessage || 'Interner Serverfehler.' });
});

// Gebautes React-Frontend ausliefern (liegt bei Multi-Stage-Docker-Build unter ./public).
// Wenn der Ordner fehlt (z.B. lokale Entwicklung ohne Build), einfach überspringen -
// dann läuft nur die API, und das Frontend kommt separat über `npm run dev` in client/.
const clientDist = path.join(__dirname, '..', 'public');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`SBL-Server läuft auf Port ${PORT}`);
});

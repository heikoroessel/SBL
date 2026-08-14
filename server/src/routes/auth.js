import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { issueToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth.js';

const router = Router();

// Ein einziger Login-Endpunkt: probiert zuerst Admin, dann Organisations-Bearbeiter.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
  }

  const adminRes = await pool.query('SELECT * FROM admins WHERE email = $1', [email.toLowerCase()]);
  if (adminRes.rows.length > 0) {
    const admin = adminRes.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Falsches Passwort.' });
    const token = issueToken({ role: 'admin', adminId: admin.id, name: admin.name });
    setAuthCookie(res, token);
    return res.json({ role: 'admin', name: admin.name, email: admin.email });
  }

  const orgUserRes = await pool.query(
    `SELECT ou.*, o.name AS organization_name, o.slug AS organization_slug, o.is_active AS org_active
     FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
     WHERE ou.email = $1`,
    [email.toLowerCase()]
  );
  if (orgUserRes.rows.length === 0) {
    return res.status(401).json({ error: 'Unbekannte E-Mail-Adresse.' });
  }
  const orgUser = orgUserRes.rows[0];
  if (!orgUser.is_active || !orgUser.org_active) {
    return res.status(403).json({ error: 'Zugang ist deaktiviert. Bitte an den Administrator wenden.' });
  }
  if (!orgUser.password_hash) {
    return res.status(403).json({ error: 'Für dieses Konto wurde noch kein Passwort vergeben.' });
  }
  const ok = await bcrypt.compare(password, orgUser.password_hash);
  if (!ok) return res.status(401).json({ error: 'Falsches Passwort.' });

  const token = issueToken({
    role: 'org_user',
    orgUserId: orgUser.id,
    organizationId: orgUser.organization_id,
    name: orgUser.name,
  });
  setAuthCookie(res, token);
  return res.json({
    role: 'org_user',
    name: orgUser.name,
    email: orgUser.email,
    organizationId: orgUser.organization_id,
    organizationName: orgUser.organization_name,
  });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.auth);
});

// Erstes Passwort setzen (Admin hinterlegt die E-Mail, Bearbeiter vergibt sich selbst ein Passwort).
router.post('/set-password', async (req, res) => {
  const { email, password, setupToken } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben.' });
  }
  const orgUserRes = await pool.query('SELECT * FROM org_users WHERE email = $1', [email.toLowerCase()]);
  if (orgUserRes.rows.length === 0) {
    return res.status(404).json({ error: 'Für diese E-Mail wurde kein Zugang angelegt. Bitte an den Administrator wenden.' });
  }
  const orgUser = orgUserRes.rows[0];
  // Hinweis: In dieser MVP-Version ohne E-Mail-Versand gibt es keinen Einmal-Token-Check;
  // das Setzen ist nur beim allerersten Mal (password_hash noch leer) erlaubt.
  if (orgUser.password_hash) {
    return res.status(403).json({ error: 'Für dieses Konto ist bereits ein Passwort gesetzt. Bitte den Administrator um Zurücksetzen bitten.' });
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE org_users SET password_hash = $1 WHERE id = $2', [hash, orgUser.id]);
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);

const slugify = (s) =>
  s.toLowerCase().trim()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c]))
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// ---------- Organisationen ----------

router.get('/organizations', async (req, res) => {
  const result = await pool.query(`
    SELECT o.*, COUNT(ou.id) AS user_count
    FROM organizations o
    LEFT JOIN org_users ou ON ou.organization_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `);
  res.json(result.rows);
});

router.post('/organizations', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich.' });
  let slug = slugify(name);
  const existing = await pool.query('SELECT id FROM organizations WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) slug = `${slug}-${Date.now().toString(36)}`;
  const result = await pool.query(
    'INSERT INTO organizations (name, slug) VALUES ($1,$2) RETURNING *',
    [name, slug]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/organizations/:id', async (req, res) => {
  const { name, is_active } = req.body;
  const result = await pool.query(
    `UPDATE organizations SET
       name = COALESCE($1, name),
       is_active = COALESCE($2, is_active)
     WHERE id = $3 RETURNING *`,
    [name ?? null, typeof is_active === 'boolean' ? is_active : null, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(result.rows[0]);
});

// ---------- Bearbeiter (org_users) ----------

router.get('/organizations/:id/users', async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, name, is_active, password_hash IS NOT NULL AS has_password, created_at FROM org_users WHERE organization_id = $1 ORDER BY created_at',
    [req.params.id]
  );
  res.json(result.rows);
});

router.post('/organizations/:id/users', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'E-Mail und Name erforderlich.' });
  try {
    const result = await pool.query(
      'INSERT INTO org_users (organization_id, email, name) VALUES ($1,$2,$3) RETURNING id, email, name, is_active, created_at',
      [req.params.id, email.toLowerCase(), name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben.' });
    throw err;
  }
});

router.patch('/users/:id', async (req, res) => {
  const { is_active, name } = req.body;
  const result = await pool.query(
    `UPDATE org_users SET
       is_active = COALESCE($1, is_active),
       name = COALESCE($2, name)
     WHERE id = $3 RETURNING id, email, name, is_active`,
    [typeof is_active === 'boolean' ? is_active : null, name ?? null, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(result.rows[0]);
});

// Admin kann Passwort zurücksetzen (löscht Hash, Bearbeiter muss sich neu setzen -> /auth/set-password)
router.post('/users/:id/reset-password', async (req, res) => {
  await pool.query('UPDATE org_users SET password_hash = NULL WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Endgültig löschen (z.B. bei fälschlicher Zuordnung) — gibt die E-Mail-Adresse wieder frei.
router.delete('/users/:id', async (req, res) => {
  await pool.query('DELETE FROM org_users WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ---------- Lerngruppen ----------

router.get('/learning-groups', async (req, res) => {
  const result = await pool.query(`
    SELECT lg.*,
      COALESCE(json_agg(json_build_object('id', o.id, 'name', o.name)) FILTER (WHERE o.id IS NOT NULL), '[]') AS organizations
    FROM learning_groups lg
    LEFT JOIN learning_group_members lgm ON lgm.learning_group_id = lg.id
    LEFT JOIN organizations o ON o.id = lgm.organization_id
    GROUP BY lg.id
    ORDER BY lg.created_at DESC
  `);
  res.json(result.rows);
});

router.post('/learning-groups', async (req, res) => {
  const { name, organization_ids = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lg = await client.query('INSERT INTO learning_groups (name) VALUES ($1) RETURNING *', [name]);
    for (const orgId of organization_ids) {
      await client.query(
        'INSERT INTO learning_group_members (learning_group_id, organization_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [lg.rows[0].id, orgId]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(lg.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.post('/learning-groups/:id/members', async (req, res) => {
  const { organization_id } = req.body;
  await pool.query(
    'INSERT INTO learning_group_members (learning_group_id, organization_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.params.id, organization_id]
  );
  res.json({ ok: true });
});

router.patch('/learning-groups/:id', async (req, res) => {
  const { name, is_active } = req.body;
  const result = await pool.query(
    `UPDATE learning_groups SET
       name = COALESCE($1, name),
       is_active = COALESCE($2, is_active)
     WHERE id = $3 RETURNING *`,
    [name ?? null, typeof is_active === 'boolean' ? is_active : null, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(result.rows[0]);
});

router.delete('/learning-groups/:id/members/:orgId', async (req, res) => {
  await pool.query(
    'DELETE FROM learning_group_members WHERE learning_group_id = $1 AND organization_id = $2',
    [req.params.id, req.params.orgId]
  );
  res.json({ ok: true });
});

// ---------- Module ----------

router.get('/modules', async (req, res) => {
  const modules = await pool.query('SELECT * FROM modules ORDER BY number NULLS LAST, created_at');
  const tasks = await pool.query(`
    SELECT mt.*, f.label AS field_label, p.label AS perspective_label, p.color_hex,
      EXISTS (SELECT 1 FROM postits po WHERE po.module_task_id = mt.id) AS has_postits
    FROM module_tasks mt
    JOIN fields f ON f.key = mt.field_key
    JOIN perspectives p ON p.key = mt.perspective_key
    ORDER BY mt.module_id, mt.sort_order
  `);
  const byModule = {};
  for (const t of tasks.rows) {
    (byModule[t.module_id] ||= []).push(t);
  }
  res.json(modules.rows.map((m) => ({ ...m, tasks: byModule[m.id] || [] })));
});

// Neues Modul anlegen (z.B. Modul 17+) - Struktur leer, Tasks werden separat hinzugefügt
router.post('/modules', async (req, res) => {
  const { number, title, subtitle, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich.' });
  const result = await pool.query(
    'INSERT INTO modules (number, title, subtitle, description) VALUES ($1,$2,$3,$4) RETURNING *',
    [number ?? null, title, subtitle ?? null, description ?? null]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/modules/:id', async (req, res) => {
  const { title, subtitle, description, is_active } = req.body;
  const result = await pool.query(
    `UPDATE modules SET
       title = COALESCE($1, title),
       subtitle = COALESCE($2, subtitle),
       description = COALESCE($3, description),
       is_active = COALESCE($4, is_active)
     WHERE id = $5 RETURNING *`,
    [title ?? null, subtitle ?? null, description ?? null, typeof is_active === 'boolean' ? is_active : null, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(result.rows[0]);
});

// Löschen nur erlaubt, wenn das Modul noch nie einer Lerngruppe zugewiesen wurde
// und keine Organisation bereits ein Postit dazu ausgefüllt hat. Sonst: deaktivieren.
router.delete('/modules/:id', async (req, res) => {
  const assigned = await pool.query('SELECT COUNT(*) FROM assignments WHERE module_id = $1', [req.params.id]);
  const postitCount = await pool.query(
    `SELECT COUNT(*) FROM postits po JOIN module_tasks mt ON mt.id = po.module_task_id WHERE mt.module_id = $1`,
    [req.params.id]
  );
  if (Number(assigned.rows[0].count) > 0 || Number(postitCount.rows[0].count) > 0) {
    return res.status(409).json({
      error: 'Dieses Modul wurde bereits einer Lerngruppe zugewiesen oder bearbeitet und kann nicht gelöscht werden. Bitte stattdessen deaktivieren.',
      inUse: true,
    });
  }
  await pool.query('DELETE FROM modules WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

router.post('/modules/:id/tasks', async (req, res) => {
  const { field_key, perspective_key, task_type, question_1, question_2, questions_extra } = req.body;
  if (!field_key || !perspective_key || !task_type) {
    return res.status(400).json({ error: 'field_key, perspective_key und task_type sind erforderlich.' });
  }
  const countRes = await pool.query('SELECT COUNT(*) FROM module_tasks WHERE module_id = $1', [req.params.id]);
  const result = await pool.query(
    `INSERT INTO module_tasks (module_id, field_key, perspective_key, task_type, question_1, question_2, questions_extra, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.id, field_key, perspective_key, task_type, question_1 ?? null, question_2 ?? null, JSON.stringify(questions_extra ?? []), Number(countRes.rows[0].count)]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/module-tasks/:id', async (req, res) => {
  const { field_key, perspective_key, task_type, question_1, question_2, questions_extra, is_active, confirmed } = req.body;

  // Warnhinweis-Pflicht: wenn die Kachel schon von Organisationen beantwortet wurde,
  // muss der Client explizit `confirmed: true` mitschicken (nach Bestätigung des Warndialogs).
  const used = await pool.query('SELECT COUNT(*) FROM postits WHERE module_task_id = $1', [req.params.id]);
  if (Number(used.rows[0].count) > 0 && !confirmed && typeof is_active !== 'boolean') {
    return res.status(409).json({
      error: 'Diese Kachel wurde bereits von Organisationen beantwortet. Die Änderung wirkt sich für alle aus.',
      requiresConfirmation: true,
    });
  }

  const result = await pool.query(
    `UPDATE module_tasks SET
       field_key = COALESCE($1, field_key),
       perspective_key = COALESCE($2, perspective_key),
       task_type = COALESCE($3, task_type),
       question_1 = COALESCE($4, question_1),
       question_2 = COALESCE($5, question_2),
       questions_extra = COALESCE($6, questions_extra),
       is_active = COALESCE($7, is_active)
     WHERE id = $8 RETURNING *`,
    [
      field_key ?? null, perspective_key ?? null, task_type ?? null,
      question_1 ?? null, question_2 ?? null,
      questions_extra ? JSON.stringify(questions_extra) : null,
      typeof is_active === 'boolean' ? is_active : null,
      req.params.id,
    ]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(result.rows[0]);
});

// Löschen nur erlaubt, wenn noch keine Organisation dazu ein Postit ausgefüllt hat.
router.delete('/module-tasks/:id', async (req, res) => {
  const used = await pool.query('SELECT COUNT(*) FROM postits WHERE module_task_id = $1', [req.params.id]);
  if (Number(used.rows[0].count) > 0) {
    return res.status(409).json({
      error: 'Diese Kachel wurde bereits von Organisationen beantwortet und kann nicht gelöscht werden. Bitte stattdessen deaktivieren.',
      inUse: true,
    });
  }
  await pool.query('DELETE FROM module_tasks WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Referenzdaten für Formulare im Admin-Bereich
router.get('/reference', async (req, res) => {
  const fields = await pool.query('SELECT * FROM fields ORDER BY sort_order');
  const perspectives = await pool.query('SELECT * FROM perspectives ORDER BY sort_order');
  res.json({ fields: fields.rows, perspectives: perspectives.rows });
});

// ---------- Freigabe / Zuweisung ----------

router.get('/learning-groups/:id/assignments', async (req, res) => {
  const result = await pool.query(
    `SELECT a.*, m.number, m.title, m.subtitle
     FROM assignments a JOIN modules m ON m.id = a.module_id
     WHERE a.learning_group_id = $1
     ORDER BY a.released_at DESC`,
    [req.params.id]
  );
  res.json(result.rows);
});

router.post('/learning-groups/:id/assignments', async (req, res) => {
  const { module_id } = req.body;
  if (!module_id) return res.status(400).json({ error: 'module_id erforderlich.' });
  try {
    const result = await pool.query(
      `INSERT INTO assignments (learning_group_id, module_id, released_by_admin)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, module_id, req.auth.adminId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Dieses Modul ist für diese Lerngruppe bereits freigegeben.' });
    throw err;
  }
});

// Fortschritt: pro Organisation, wie viele Pflicht-/Wahl-Postits sind für die freigegebenen Module
// erledigt, plus wie viele Aufgaben (To-Dos) definiert/offen/abgeschlossen sind.
router.get('/learning-groups/:id/progress', async (req, res) => {
  const result = await pool.query(
    `
    SELECT
      o.id AS organization_id,
      o.name AS organization_name,
      a.module_id,
      m.number AS module_number,
      m.title AS module_title,
      COUNT(DISTINCT mt.id) FILTER (WHERE mt.task_type = 'pflicht') AS pflicht_total,
      COUNT(DISTINCT p.id) FILTER (WHERE mt.task_type = 'pflicht' AND p.is_completed) AS pflicht_done,
      COUNT(DISTINCT mt.id) FILTER (WHERE mt.task_type = 'optional') AS optional_total,
      COUNT(DISTINCT p.id) FILTER (WHERE mt.task_type = 'optional' AND p.is_completed) AS optional_done,
      COUNT(DISTINCT t.id) AS todos_total,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_done) AS todos_done,
      COUNT(DISTINCT t.id) FILTER (WHERE NOT t.is_done) AS todos_open
    FROM learning_group_members lgm
    JOIN organizations o ON o.id = lgm.organization_id
    JOIN assignments a ON a.learning_group_id = lgm.learning_group_id
    JOIN modules m ON m.id = a.module_id
    JOIN module_tasks mt ON mt.module_id = m.id
    LEFT JOIN postits p ON p.module_task_id = mt.id AND p.organization_id = o.id
    LEFT JOIN todos t ON t.postit_id = p.id
    WHERE lgm.learning_group_id = $1
    GROUP BY o.id, o.name, a.module_id, m.number, m.title
    ORDER BY o.name, m.number
    `,
    [req.params.id]
  );
  res.json(result.rows);
});

// ---------- Punkte-Einstellungen ----------

router.get('/point-settings', async (req, res) => {
  let result = await pool.query('SELECT * FROM point_settings WHERE id = 1');
  if (result.rows.length === 0) {
    // Selbstheilend: falls die Standardzeile aus irgendeinem Grund fehlt, jetzt anlegen.
    await pool.query('INSERT INTO point_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
    result = await pool.query('SELECT * FROM point_settings WHERE id = 1');
  }
  res.json(result.rows[0]);
});

router.put('/point-settings', async (req, res) => {
  const { points_postit_pflicht, points_postit_optional, points_todo_created, points_todo_done_rated } = req.body;
  const result = await pool.query(
    `UPDATE point_settings SET
       points_postit_pflicht = COALESCE($1, points_postit_pflicht),
       points_postit_optional = COALESCE($2, points_postit_optional),
       points_todo_created = COALESCE($3, points_todo_created),
       points_todo_done_rated = COALESCE($4, points_todo_done_rated),
       updated_at = now()
     WHERE id = 1 RETURNING *`,
    [points_postit_pflicht ?? null, points_postit_optional ?? null, points_todo_created ?? null, points_todo_done_rated ?? null]
  );
  res.json(result.rows[0]);
});

export default router;

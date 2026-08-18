import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireOrgUser } from '../middleware/auth.js';

const router = Router();
router.use(requireOrgUser);

async function getPointSettings(client) {
  const result = await client.query('SELECT * FROM point_settings WHERE id = 1');
  return result.rows[0] || {
    points_postit_pflicht: 10, points_postit_optional: 10,
    points_todo_created: 1, points_todo_done_rated: 5,
  };
}

async function awardPoints(client, organizationId, points, reason, referenceId) {
  if (!points) return;
  await client.query(
    'INSERT INTO point_events (organization_id, points, reason, reference_id) VALUES ($1,$2,$3,$4)',
    [organizationId, points, reason, referenceId]
  );
}

// ---------- Referenzdaten (Felder/Perspektiven) ----------

router.get('/reference', async (req, res) => {
  const fields = await pool.query('SELECT * FROM fields ORDER BY sort_order');
  const perspectives = await pool.query('SELECT * FROM perspectives ORDER BY sort_order');
  res.json({ fields: fields.rows, perspectives: perspectives.rows });
});

router.get('/colleagues', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email FROM org_users WHERE organization_id = $1 AND is_active = true ORDER BY name',
    [req.auth.organizationId]
  );
  res.json(result.rows);
});

// Aktuelle Punktekonfiguration (für die Info-Erklärung im Bearbeiter-Bereich)
router.get('/points/config', async (req, res) => {
  const settings = await getPointSettings(pool);
  res.json(settings);
});

// ---------- In-App-Guide ----------

router.get('/guide-status', async (req, res) => {
  const result = await pool.query('SELECT guide_dismissed FROM org_users WHERE id = $1', [req.auth.orgUserId]);
  res.json({ dismissed: result.rows[0]?.guide_dismissed || false });
});

router.patch('/guide-status', async (req, res) => {
  const { dismissed } = req.body;
  await pool.query('UPDATE org_users SET guide_dismissed = $1 WHERE id = $2', [!!dismissed, req.auth.orgUserId]);
  res.json({ dismissed: !!dismissed });
});

// ---------- Hausaufgaben (freigegebene, noch nicht abgeschlossene Module) ----------

router.get('/homework', async (req, res) => {
  const orgId = req.auth.organizationId;
  const result = await pool.query(
    `
    SELECT DISTINCT a.id AS assignment_id, a.module_id, a.released_at, m.number, m.title, m.subtitle, m.description
    FROM assignments a
    JOIN learning_group_members lgm ON lgm.learning_group_id = a.learning_group_id
    JOIN modules m ON m.id = a.module_id
    WHERE lgm.organization_id = $1
    ORDER BY a.released_at DESC
    `,
    [orgId]
  );

  const modules = [];
  for (const row of result.rows) {
    const tasks = await pool.query(
      `
      SELECT mt.*, f.label AS field_label, p.label AS perspective_label, p.color_hex,
        po.id AS postit_id, po.reflection_answer, po.card_title, po.intention, po.is_completed,
        CASE
          WHEN po.is_completed IS NOT TRUE THEN NULL
          WHEN EXISTS (SELECT 1 FROM todos t WHERE t.postit_id = po.id AND NOT t.is_done AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) THEN 'ueberfaellig'
          WHEN EXISTS (SELECT 1 FROM todos t WHERE t.postit_id = po.id AND NOT t.is_done) THEN 'offen'
          ELSE 'erledigt'
        END AS status
      FROM module_tasks mt
      JOIN fields f ON f.key = mt.field_key
      JOIN perspectives p ON p.key = mt.perspective_key
      LEFT JOIN postits po ON po.module_task_id = mt.id AND po.organization_id = $1
      WHERE mt.module_id = $2 AND (mt.is_active = true OR po.id IS NOT NULL)
      ORDER BY mt.sort_order
      `,
      [orgId, row.module_id]
    );
    modules.push({ ...row, tasks: tasks.rows });
  }
  res.json(modules);
});

// ---------- Postits ----------

// Postit anlegen/aktualisieren (upsert je organization_id + module_task_id)
router.put('/postits/task/:moduleTaskId', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { reflection_answer, card_title, intention, mark_completed } = req.body;
  const client = await pool.connect();
  let postit, wasCompleted, willBeCompleted, taskType;
  try {
    await client.query('BEGIN');

    const taskRes = await client.query('SELECT task_type FROM module_tasks WHERE id = $1', [req.params.moduleTaskId]);
    if (taskRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Feld nicht gefunden.' });
    }
    taskType = taskRes.rows[0].task_type;

    const existing = await client.query(
      'SELECT * FROM postits WHERE organization_id = $1 AND module_task_id = $2',
      [orgId, req.params.moduleTaskId]
    );

    wasCompleted = existing.rows[0]?.is_completed || false;
    willBeCompleted = mark_completed ?? wasCompleted;

    if (existing.rows.length === 0) {
      const insertRes = await client.query(
        `INSERT INTO postits
           (organization_id, module_task_id, reflection_answer, card_title, intention, is_completed, completed_at, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
        [
          orgId, req.params.moduleTaskId, reflection_answer ?? null, card_title ?? null, intention ?? null,
          willBeCompleted, willBeCompleted ? new Date() : null, req.auth.orgUserId,
        ]
      );
      postit = insertRes.rows[0];
    } else {
      const updateRes = await client.query(
        `UPDATE postits SET
           reflection_answer = COALESCE($1, reflection_answer),
           card_title = COALESCE($2, card_title),
           intention = COALESCE($3, intention),
           is_completed = $4,
           completed_at = CASE WHEN $4 AND completed_at IS NULL THEN now() ELSE completed_at END,
           updated_by = $5,
           updated_at = now()
         WHERE id = $6 RETURNING *`,
        [reflection_answer ?? null, card_title ?? null, intention ?? null, willBeCompleted, req.auth.orgUserId, existing.rows[0].id]
      );
      postit = updateRes.rows[0];
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Punkte werden bewusst NACH dem Commit und in einer eigenen Verbindung vergeben:
  // ein Problem bei der Punktevergabe darf niemals das Speichern des Postits selbst verhindern.
  if (!wasCompleted && willBeCompleted) {
    try {
      const settings = await getPointSettings(pool);
      const points = taskType === 'pflicht' ? settings.points_postit_pflicht : settings.points_postit_optional;
      const reason = taskType === 'pflicht' ? 'postit_pflicht' : 'postit_optional';
      await awardPoints(pool, orgId, points, reason, postit.id);
    } catch (err) {
      console.error('Punktevergabe für Postit fehlgeschlagen (Postit wurde trotzdem gespeichert):', err);
    }
  }

  res.json(postit);
});

// ---------- Landkarte (Canvas): alle Postits der eigenen Organisation, gruppiert nach Feld ----------

router.get('/canvas', async (req, res) => {
  const orgId = req.auth.organizationId;
  const fields = await pool.query('SELECT * FROM fields ORDER BY sort_order');
  const postits = await pool.query(
    `
    SELECT po.*, mt.field_key, mt.perspective_key, mt.task_type, mt.question_1, mt.question_2,
      p.label AS perspective_label, p.color_hex, m.number AS module_number, m.title AS module_title,
      (SELECT COUNT(*) FROM todos t WHERE t.postit_id = po.id) AS todo_count,
      (SELECT COUNT(*) FROM todos t WHERE t.postit_id = po.id AND t.is_done) AS todo_done_count,
      CASE
        WHEN EXISTS (SELECT 1 FROM todos t WHERE t.postit_id = po.id AND NOT t.is_done AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) THEN 'ueberfaellig'
        WHEN EXISTS (SELECT 1 FROM todos t WHERE t.postit_id = po.id AND NOT t.is_done) THEN 'offen'
        ELSE 'erledigt'
      END AS status
    FROM postits po
    JOIN module_tasks mt ON mt.id = po.module_task_id
    JOIN perspectives p ON p.key = mt.perspective_key
    JOIN modules m ON m.id = mt.module_id
    WHERE po.organization_id = $1 AND po.is_completed = true
    ORDER BY po.created_at
    `,
    [orgId]
  );

  const byField = {};
  for (const p of postits.rows) {
    (byField[p.field_key] ||= []).push(p);
  }
  res.json(fields.rows.map((f) => ({ ...f, postits: byField[f.key] || [] })));
});

// ---------- To-Dos ----------

router.post('/postits/:postitId/todos', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { description, due_date, priority, assignee_id } = req.body;
  if (!description) return res.status(400).json({ error: 'Beschreibung erforderlich.' });

  const result = await pool.query(
    `INSERT INTO todos (postit_id, organization_id, description, due_date, priority, assignee_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.postitId, orgId, description, due_date ?? null, priority ?? 'B', assignee_id ?? req.auth.orgUserId, req.auth.orgUserId]
  );

  try {
    const settings = await getPointSettings(pool);
    await awardPoints(pool, orgId, settings.points_todo_created, 'todo_created', result.rows[0].id);
  } catch (err) {
    console.error('Punktevergabe für neue Aufgabe fehlgeschlagen (Aufgabe wurde trotzdem angelegt):', err);
  }

  res.status(201).json(result.rows[0]);
});

router.get('/todos', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { mine } = req.query;
  const params = [orgId];
  let filter = '';
  if (mine === 'true') {
    params.push(req.auth.orgUserId);
    filter = 'AND t.assignee_id = $2';
  }
  const result = await pool.query(
    `
    SELECT t.*, po.card_title, po.module_task_id, mt.field_key, f.label AS field_label,
      m.number AS module_number, m.title AS module_title,
      ou.name AS assignee_name, creator.name AS created_by_name
    FROM todos t
    JOIN postits po ON po.id = t.postit_id
    JOIN module_tasks mt ON mt.id = po.module_task_id
    JOIN fields f ON f.key = mt.field_key
    JOIN modules m ON m.id = mt.module_id
    LEFT JOIN org_users ou ON ou.id = t.assignee_id
    LEFT JOIN org_users creator ON creator.id = t.created_by
    WHERE t.organization_id = $1 ${filter}
    ORDER BY t.is_done ASC, t.priority ASC, t.due_date ASC NULLS LAST
    `,
    params
  );
  res.json(result.rows);
});

router.patch('/todos/:id', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { description, due_date, priority, assignee_id, note, is_done, rating_stars, rating_text, share_in_group } = req.body;

  const client = await pool.connect();
  let after, before;
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM todos WHERE id = $1 AND organization_id = $2', [req.params.id, orgId]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nicht gefunden.' });
    }
    before = existing.rows[0];
    const willBeDone = typeof is_done === 'boolean' ? is_done : before.is_done;

    const result = await client.query(
      `UPDATE todos SET
         description = COALESCE($1, description),
         due_date = COALESCE($2, due_date),
         priority = COALESCE($3, priority),
         assignee_id = COALESCE($4, assignee_id),
         note = COALESCE($5, note),
         is_done = $6,
         done_at = CASE WHEN $6 THEN COALESCE(done_at, CURRENT_DATE) ELSE NULL END,
         rating_stars = COALESCE($7, rating_stars),
         rating_text = COALESCE($8, rating_text),
         share_in_group = COALESCE($9, share_in_group),
         updated_at = now()
       WHERE id = $10 RETURNING *`,
      [
        description ?? null, due_date ?? null, priority ?? null, assignee_id ?? null, note ?? null,
        willBeDone, rating_stars ?? null, rating_text ?? null,
        typeof share_in_group === 'boolean' ? share_in_group : null, req.params.id,
      ]
    );
    after = result.rows[0];
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Punkte werden bewusst NACH dem Commit und in einer eigenen Verbindung vergeben:
  // ein Problem bei der Punktevergabe darf niemals das Abschließen der Aufgabe selbst verhindern.
  if (!before.is_done && after.is_done && after.rating_stars) {
    try {
      const settings = await getPointSettings(pool);
      await awardPoints(pool, orgId, settings.points_todo_done_rated, 'todo_done_rated', after.id);
    } catch (err) {
      console.error('Punktevergabe für Aufgabe fehlgeschlagen (Aufgabe wurde trotzdem abgeschlossen):', err);
    }
  }

  res.json(after);
});

// Löschen nur über das Kärtchen (Postit-Detail), nicht aus der Listenansicht heraus –
// der Endpunkt selbst ist derselbe, das Frontend bindet den Button nur im Kärtchen ein.
router.delete('/todos/:id', async (req, res) => {
  await pool.query('DELETE FROM todos WHERE id = $1 AND organization_id = $2', [req.params.id, req.auth.organizationId]);
  res.json({ ok: true });
});

// ---------- CSV-Export ----------

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

router.get('/todos/export', async (req, res) => {
  const orgId = req.auth.organizationId;
  const result = await pool.query(
    `
    SELECT t.description, t.priority, t.due_date, t.is_done, t.done_at, t.note,
      m.number AS module_number, f.label AS field_label, po.card_title,
      ou.name AS assignee_name, creator.name AS created_by_name
    FROM todos t
    JOIN postits po ON po.id = t.postit_id
    JOIN module_tasks mt ON mt.id = po.module_task_id
    JOIN fields f ON f.key = mt.field_key
    JOIN modules m ON m.id = mt.module_id
    LEFT JOIN org_users ou ON ou.id = t.assignee_id
    LEFT JOIN org_users creator ON creator.id = t.created_by
    WHERE t.organization_id = $1
    ORDER BY t.is_done ASC, t.priority ASC, t.due_date ASC NULLS LAST
    `,
    [orgId]
  );

  const header = ['Beschreibung', 'Priorität', 'Termin', 'Status', 'Erledigt am', 'Zuständig', 'Zugewiesen von', 'Modul', 'Feld', 'Postit', 'Notiz'];
  const lines = [header.join(';')];
  for (const t of result.rows) {
    lines.push([
      csvEscape(t.description),
      csvEscape(t.priority),
      csvEscape(t.due_date ? new Date(t.due_date).toLocaleDateString('de-DE') : ''),
      csvEscape(t.is_done ? 'erledigt' : 'offen'),
      csvEscape(t.done_at ? new Date(t.done_at).toLocaleDateString('de-DE') : ''),
      csvEscape(t.assignee_name),
      csvEscape(t.created_by_name),
      csvEscape(t.module_number ? `Modul ${t.module_number}` : ''),
      csvEscape(t.field_label),
      csvEscape(t.card_title),
      csvEscape(t.note),
    ].join(';'));
  }
  const csv = '\uFEFF' + lines.join('\r\n'); // BOM für korrekte Umlaute in Excel

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aufgaben.csv"');
  res.send(csv);
});

// ---------- Punkte ----------

router.get('/points/summary', async (req, res) => {
  const orgId = req.auth.organizationId;
  const result = await pool.query(
    'SELECT COALESCE(SUM(points),0) AS total FROM point_events WHERE organization_id = $1',
    [orgId]
  );
  res.json({ total: Number(result.rows[0].total) });
});

// Fortschrittsbalken der ganzen Lerngruppe (nur Organisations-Summen, keine Einzelpersonen)
router.get('/points/learning-group', async (req, res) => {
  const orgId = req.auth.organizationId;
  const result = await pool.query(
    `
    SELECT o.id AS organization_id, o.name AS organization_name, COALESCE(SUM(pe.points), 0) AS total
    FROM learning_group_members me
    JOIN learning_group_members peers ON peers.learning_group_id = me.learning_group_id
    JOIN organizations o ON o.id = peers.organization_id
    LEFT JOIN point_events pe ON pe.organization_id = o.id
    WHERE me.organization_id = $1
    GROUP BY o.id, o.name
    ORDER BY total DESC
    `,
    [orgId]
  );
  res.json(result.rows.map((r) => ({ ...r, total: Number(r.total) })));
});

// ---------- Pinnwand (Success Stories) ----------

router.get('/pinboard', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { scope } = req.query; // 'organization' | 'group'

  if (scope === 'group') {
    const result = await pool.query(
      `
      SELECT t.id, t.description, t.rating_stars, t.rating_text, t.done_at, o.name AS organization_name,
        po.card_title, f.label AS field_label
      FROM todos t
      JOIN organizations o ON o.id = t.organization_id
      JOIN postits po ON po.id = t.postit_id
      JOIN module_tasks mt ON mt.id = po.module_task_id
      JOIN fields f ON f.key = mt.field_key
      JOIN learning_group_members lgm ON lgm.organization_id = t.organization_id
      WHERE lgm.learning_group_id IN (SELECT learning_group_id FROM learning_group_members WHERE organization_id = $1)
        AND t.share_in_group = true AND t.is_done = true AND t.rating_stars IS NOT NULL
      ORDER BY t.done_at DESC
      `,
      [orgId]
    );
    return res.json(result.rows);
  }

  const result = await pool.query(
    `
    SELECT t.id, t.description, t.rating_stars, t.rating_text, t.done_at,
      po.card_title, f.label AS field_label
    FROM todos t
    JOIN postits po ON po.id = t.postit_id
    JOIN module_tasks mt ON mt.id = po.module_task_id
    JOIN fields f ON f.key = mt.field_key
    WHERE t.organization_id = $1 AND t.is_done = true AND t.rating_stars IS NOT NULL
    ORDER BY t.done_at DESC
    `,
    [orgId]
  );
  res.json(result.rows);
});

export default router;

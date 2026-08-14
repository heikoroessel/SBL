import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf-8'));

async function seedFields(client) {
  const fields = readJson('fields.json');
  for (const f of fields) {
    await client.query(
      `INSERT INTO fields (key, label, subtitle, sort_order, grid_row, grid_col)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (key) DO UPDATE SET label=$2, subtitle=$3, sort_order=$4, grid_row=$5, grid_col=$6`,
      [f.key, f.label, f.subtitle, f.sort_order, f.grid_row, f.grid_col]
    );
  }
  console.log(`Felder geladen: ${fields.length}`);
}

async function seedPerspectives(client) {
  const perspectives = readJson('perspectives.json');
  for (const p of perspectives) {
    await client.query(
      `INSERT INTO perspectives (key, label, theorist, color_hex, sort_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (key) DO UPDATE SET label=$2, theorist=$3, color_hex=$4, sort_order=$5`,
      [p.key, p.label, p.theorist, p.color_hex, p.sort_order]
    );
  }
  console.log(`Perspektiven geladen: ${perspectives.length}`);
}

async function seedModules(client) {
  const modules = readJson('modules.json');
  for (const m of modules) {
    const res = await client.query(
      `INSERT INTO modules (number, title, subtitle, description)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (number) DO UPDATE SET title=$2, subtitle=$3, description=$4
       RETURNING id`,
      [m.number, m.title, m.subtitle, m.description]
    );
    const moduleId = res.rows[0].id;

    // Vorhandene Tasks für dieses Modul ersetzen (idempotentes Seeding)
    await client.query('DELETE FROM module_tasks WHERE module_id = $1', [moduleId]);

    let sortOrder = 0;
    for (const t of m.tasks) {
      if (!t.field || !t.perspective) continue;
      await client.query(
        `INSERT INTO module_tasks (module_id, field_key, perspective_key, task_type, question_1, question_2, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [moduleId, t.field, t.perspective, t.type, t.question_1, t.question_2, sortOrder++]
      );
    }
  }
  console.log(`Module geladen: ${modules.length}`);
}

async function seedAdmin(client) {
  const email = process.env.SEED_ADMIN_EMAIL || 'heiko@systemischer-kompass.de';
  const password = process.env.SEED_ADMIN_PASSWORD || 'aendern123';
  const name = process.env.SEED_ADMIN_NAME || 'Heiko Rössel';
  const existing = await client.query('SELECT id FROM admins WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log('Admin existiert bereits, überspringe.');
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await client.query(
    'INSERT INTO admins (email, password_hash, name) VALUES ($1,$2,$3)',
    [email, hash, name]
  );
  console.log(`Admin angelegt: ${email} (Passwort aus ENV oder Default – bitte nach erstem Login ändern)`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedFields(client);
    await seedPerspectives(client);
    await seedModules(client);
    await seedAdmin(client);
    await client.query('COMMIT');
    console.log('Seed abgeschlossen.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed fehlgeschlagen:', err);
  process.exit(1);
});

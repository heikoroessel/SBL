-- SBL Platform schema
-- Systemische Business Landkarte / Systemischer Kompass

-- ============ Grundrechte ============

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bearbeiter: Geschäftsführer + benannte weitere Personen einer Organisation.
-- Alle Bearbeiter einer Organisation haben gleiche Rechte (kein internes Rollenmodell).
CREATE TABLE IF NOT EXISTS org_users (
  id             SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT,
  name           TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  guide_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE org_users ADD COLUMN IF NOT EXISTS guide_dismissed BOOLEAN NOT NULL DEFAULT false;

-- ============ Lerngruppen ============

CREATE TABLE IF NOT EXISTS learning_groups (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE learning_groups ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS learning_group_members (
  learning_group_id INTEGER NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
  organization_id    INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (learning_group_id, organization_id)
);

-- ============ SBL-Grundraster: 9 Felder x Perspektiven ============
-- Felder und Perspektiven sind feste Referenzwerte (nicht vom Admin editierbar),
-- da sie die visuelle Struktur der Landkarte bestimmen.

CREATE TABLE IF NOT EXISTS fields (
  key          TEXT PRIMARY KEY,        -- z.B. 'kundenbeziehungen'
  label        TEXT NOT NULL,           -- 'Kundenbeziehungen'
  subtitle     TEXT,                    -- kurze Erklärung, wie auf dem Poster
  sort_order   INTEGER NOT NULL,
  grid_row     INTEGER NOT NULL,
  grid_col     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS perspectives (
  key          TEXT PRIMARY KEY,        -- 'kultur' | 'entscheidung' | 'lernen' | 'beobachtung' | 'struktur'
  label        TEXT NOT NULL,
  theorist     TEXT,
  color_hex    TEXT NOT NULL,
  sort_order   INTEGER NOT NULL
);

-- ============ Module / Lektionen (Datenbank der Lektionen) ============
-- Beliebig erweiterbar (17, 18, 19 ... möglich), unabhängig von den 16 mitgelieferten.

CREATE TABLE IF NOT EXISTS modules (
  id           SERIAL PRIMARY KEY,
  number       INTEGER UNIQUE,          -- fortlaufende Nummer, kann NULL sein bei freien Zusatzmodulen
  title        TEXT NOT NULL,
  subtitle     TEXT,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Pflicht-/Wahlfelder pro Modul: welche Feld/Perspektive-Kombination wird bearbeitet,
-- inkl. der zwei Reflexionsfragen dazu.
CREATE TABLE IF NOT EXISTS module_tasks (
  id             SERIAL PRIMARY KEY,
  module_id      INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  field_key      TEXT NOT NULL REFERENCES fields(key),
  perspective_key TEXT NOT NULL REFERENCES perspectives(key),
  task_type      TEXT NOT NULL CHECK (task_type IN ('pflicht', 'optional')),
  question_1     TEXT,
  question_2     TEXT,
  questions_extra JSONB NOT NULL DEFAULT '[]'::jsonb,  -- weitere Fragen über question_1/2 hinaus
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE module_tasks ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE module_tasks ADD COLUMN IF NOT EXISTS questions_extra JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Vom Administrator konfigurierbare Punktwerte (einzelne Konfigurationszeile, wirkt nur zukünftig,
-- da point_events bereits vergebene Punkte unveränderlich als eigene Zeilen speichert).
CREATE TABLE IF NOT EXISTS point_settings (
  id                      INTEGER PRIMARY KEY DEFAULT 1,
  points_postit_pflicht   INTEGER NOT NULL DEFAULT 10,
  points_postit_optional  INTEGER NOT NULL DEFAULT 10,
  points_todo_created     INTEGER NOT NULL DEFAULT 1,
  points_todo_done_rated  INTEGER NOT NULL DEFAULT 5,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 1)
);

-- ============ Zuweisung: Lerngruppe bekommt ein Modul als Hausaufgabe ============

CREATE TABLE IF NOT EXISTS assignments (
  id                 SERIAL PRIMARY KEY,
  learning_group_id  INTEGER NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
  module_id          INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  released_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_by_admin  INTEGER REFERENCES admins(id),
  UNIQUE (learning_group_id, module_id)
);

-- ============ Postits: die ausgefüllten Kärtchen pro Organisation ============

CREATE TABLE IF NOT EXISTS postits (
  id               SERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_task_id   INTEGER NOT NULL REFERENCES module_tasks(id) ON DELETE CASCADE,
  -- Reflexionsebene
  reflection_answer TEXT,
  -- Umsetzungsebene
  card_title       TEXT,
  goal_question    TEXT DEFAULT 'Was will ich hier leisten?',
  intention        TEXT,               -- geplantes Vorhaben für die eigene Organisation
  is_completed     BOOLEAN NOT NULL DEFAULT false,
  completed_at     TIMESTAMPTZ,
  created_by       INTEGER REFERENCES org_users(id),
  updated_by       INTEGER REFERENCES org_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, module_task_id)
);

-- ============ To-Dos pro Postit ============

CREATE TABLE IF NOT EXISTS todos (
  id             SERIAL PRIMARY KEY,
  postit_id      INTEGER NOT NULL REFERENCES postits(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description    TEXT NOT NULL,
  due_date       DATE,
  priority       TEXT NOT NULL DEFAULT 'B' CHECK (priority IN ('A', 'B', 'C')),
  assignee_id    INTEGER REFERENCES org_users(id),
  is_done        BOOLEAN NOT NULL DEFAULT false,
  done_at        DATE,
  note           TEXT,
  -- Erfolgsbewertung beim Abschließen
  rating_stars   INTEGER CHECK (rating_stars BETWEEN 1 AND 5),
  rating_text    TEXT,
  share_in_group BOOLEAN NOT NULL DEFAULT false,
  created_by     INTEGER REFERENCES org_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Gamification ============

-- Punkte-Ledger: jede Punktegutschrift als eigene Zeile (nachvollziehbar, additiv).
CREATE TABLE IF NOT EXISTS point_events (
  id              SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  points          INTEGER NOT NULL,
  reason          TEXT NOT NULL,        -- 'postit_pflicht' | 'postit_optional' | 'todo_created' | 'todo_done' | 'todo_done_rated'
  reference_id    INTEGER,              -- postit_id oder todo_id, je nach reason
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO point_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============ Indexe ============

CREATE INDEX IF NOT EXISTS idx_org_users_org ON org_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_module_tasks_module ON module_tasks(module_id);
CREATE INDEX IF NOT EXISTS idx_assignments_group ON assignments(learning_group_id);
CREATE INDEX IF NOT EXISTS idx_postits_org ON postits(organization_id);
CREATE INDEX IF NOT EXISTS idx_todos_org ON todos(organization_id);
CREATE INDEX IF NOT EXISTS idx_todos_postit ON todos(postit_id);
CREATE INDEX IF NOT EXISTS idx_point_events_org ON point_events(organization_id);

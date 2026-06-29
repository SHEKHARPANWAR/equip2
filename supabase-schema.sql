-- ============================================================
-- SYRMA SGS — MACHINE BREAKDOWN MONITORING SYSTEM
-- Supabase Schema (v3 — simplified, no roles, no audit, no
-- master-data admin page, with document uploads)
--
-- Project: oqjotrbrwjqwdevicmec
--
-- WHAT THIS CREATES:
--   1. machines            -> one row per machine (master data + status)
--   2. breakdown_events    -> one row per failure -> repair cycle
--   3. machine_documents   -> metadata for files uploaded against a machine
--   4. a public Storage bucket "machine-documents" for the actual files
--   5. Row Level Security on everything: any signed-in user can read
--      and write (no separate admin/operator distinction)
--
-- Safe to run multiple times — every statement guards against
-- re-creating or duplicating existing objects.
--
-- HOW TO USE:
--   1. Supabase Dashboard -> SQL Editor -> New Query
--   2. Paste this entire file -> Run
--   3. Done.
-- ============================================================


-- ============================================================
-- TABLE: MACHINES
-- ============================================================
CREATE TABLE IF NOT EXISTS machines (
  id            TEXT PRIMARY KEY,
  area          TEXT NOT NULL,
  line          TEXT NOT NULL,
  customer      TEXT NOT NULL,
  machine       TEXT NOT NULL,
  asset_no      TEXT,
  serial_no     TEXT,
  install_date  DATE,
  status        TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','breakdown')),
  qr_payload    TEXT,
  created_by    UUID,
  updated_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: BREAKDOWN_EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS breakdown_events (
  id          TEXT PRIMARY KEY,
  machine_id  TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  fail_ts     BIGINT NOT NULL,
  repair_ts   BIGINT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_by  UUID,
  updated_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: MACHINE_DOCUMENTS
-- Metadata for files attached to a machine (manuals, warranty
-- cards, etc). The actual file bytes live in Supabase Storage,
-- bucket "machine-documents"; this table just tracks who
-- uploaded what, when, and the storage path to fetch it.
-- ============================================================
CREATE TABLE IF NOT EXISTS machine_documents (
  id            TEXT PRIMARY KEY,
  machine_id    TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_size     BIGINT,
  content_type  TEXT,
  uploaded_by   UUID,
  uploaded_by_name TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_machine_id   ON breakdown_events(machine_id);
CREATE INDEX IF NOT EXISTS idx_events_status        ON breakdown_events(status);
CREATE INDEX IF NOT EXISTS idx_documents_machine_id ON machine_documents(machine_id);

-- ============================================================
-- ROW LEVEL SECURITY — database tables
-- Any signed-in user can read/write. No role distinctions.
-- ============================================================
ALTER TABLE machines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakdown_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read machines"   ON machines;
DROP POLICY IF EXISTS "Authenticated users can modify machines" ON machines;
CREATE POLICY "Authenticated users can read machines"
  ON machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can modify machines"
  ON machines FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read events"   ON breakdown_events;
DROP POLICY IF EXISTS "Authenticated users can modify events" ON breakdown_events;
CREATE POLICY "Authenticated users can read events"
  ON breakdown_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can modify events"
  ON breakdown_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read documents"   ON machine_documents;
DROP POLICY IF EXISTS "Authenticated users can modify documents" ON machine_documents;
CREATE POLICY "Authenticated users can read documents"
  ON machine_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can modify documents"
  ON machine_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET — machine-documents
-- Public bucket so uploaded manuals/warranty cards can be viewed
-- on the website with a plain URL (no signed-URL expiry to manage).
-- Uploading/deleting files still requires being signed in — see
-- the storage.objects policies below.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-documents', 'machine-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view machine documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload machine documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete machine documents" ON storage.objects;

CREATE POLICY "Public can view machine documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'machine-documents');

CREATE POLICY "Authenticated users can upload machine documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'machine-documents');

CREATE POLICY "Authenticated users can delete machine documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'machine-documents');

-- ============================================================
-- VERIFY (optional — run separately to confirm)
-- ============================================================
-- SELECT count(*) FROM machines;
-- SELECT count(*) FROM breakdown_events;
-- SELECT count(*) FROM machine_documents;
-- SELECT * FROM storage.buckets WHERE id = 'machine-documents';

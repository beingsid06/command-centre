-- ============================================================
-- Scapia Command Centre — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'Agent' CHECK (role IN ('Agent', 'Supervisor', 'Admin')),
  active BOOLEAN NOT NULL DEFAULT true,
  password TEXT NOT NULL DEFAULT 'Welcome@1234',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Callbacks table
CREATE TABLE IF NOT EXISTS callbacks (
  id TEXT PRIMARY KEY,                          -- CB-00001 sequential
  ticket_id TEXT NOT NULL,                      -- FD-12345
  customer_name TEXT NOT NULL,
  ticket_link TEXT,
  subject TEXT NOT NULL,
  category TEXT,
  type TEXT NOT NULL DEFAULT 'Normal Callback Request',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promised_hours NUMERIC(6,2) NOT NULL DEFAULT 24,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in-progress', 'completed')),
  assigned_agent TEXT,
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_at TIMESTAMPTZ,
  parent_callback_id TEXT REFERENCES callbacks(id),
  freshdesk_agent TEXT,
  force_release_count INTEGER DEFAULT 0,
  auto_release_count INTEGER DEFAULT 0,
  extend_count INTEGER DEFAULT 0,
  force_release_notes TEXT
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_callbacks_status ON callbacks(status);
CREATE INDEX IF NOT EXISTS idx_callbacks_ticket_id ON callbacks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_assigned_agent ON callbacks(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_callbacks_created_at ON callbacks(created_at);

-- 3. Logs table
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  callback_id TEXT NOT NULL,
  action TEXT NOT NULL,
  agent TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_callback_id ON logs(callback_id);

-- 4. Config table (key-value store for SLA thresholds, etc.)
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default SLA config
INSERT INTO config (key, value) VALUES
  ('sla_safe', '240'),
  ('sla_monitoring', '120'),
  ('sla_urgent', '30'),
  ('sla_critical', '0')
ON CONFLICT (key) DO NOTHING;

-- 5. Sequence for callback IDs
CREATE SEQUENCE IF NOT EXISTS callback_id_seq START 1;

-- 6. Function to generate next callback ID
CREATE OR REPLACE FUNCTION next_callback_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'CB-' || LPAD(nextval('callback_id_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 7. Insert default admin user
INSERT INTO users (name, email, role, password) VALUES
  ('Admin', 'admin@scapia.cards', 'Admin', 'Welcome@1234')
ON CONFLICT (email) DO NOTHING;

-- 8. Enable Row Level Security (RLS) - optional but recommended
-- For simplicity, we'll use service role key in API which bypasses RLS
-- If you want RLS, uncomment and configure policies:
-- ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 9. Helpful view for stats
CREATE OR REPLACE VIEW callback_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'assigned') AS assigned,
  COUNT(*) FILTER (WHERE status = 'in-progress') AS in_progress,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'completed' AND completed_at <= deadline) AS within_sla,
  COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > deadline) AS post_sla,
  SUM(force_release_count) AS total_force_releases,
  SUM(auto_release_count) AS total_auto_releases
FROM callbacks;

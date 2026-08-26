-- =============================================
-- SISTEMA CAPONI — SCHEMA INICIAL
-- =============================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- para similaridade textual

-- =============================================
-- ORGANIZATIONS
-- =============================================
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  city        TEXT,
  state       CHAR(2),
  logo_url    TEXT,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USERS (extends Supabase Auth)
-- =============================================
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'operator')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADDRESSES
-- =============================================
CREATE TABLE addresses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID REFERENCES organizations(id),
  street            TEXT,
  number            TEXT,
  complement        TEXT,
  neighborhood      TEXT,
  city              TEXT,
  state             CHAR(2),
  zip_code          TEXT,
  normalized_key    TEXT,        -- chave normalizada para matching
  raw_text          TEXT,        -- texto original do OCR
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),
  geocoded_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_normalized_key ON addresses(normalized_key);
CREATE INDEX idx_addresses_zip_code ON addresses(zip_code);
CREATE INDEX idx_addresses_trgm ON addresses USING gin(normalized_key gin_trgm_ops);

-- =============================================
-- BAGS (SACOS)
-- =============================================
CREATE TYPE bag_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'FINISHED',
  'REOPENED',
  'CANCELLED'
);

CREATE TABLE bags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  code            TEXT NOT NULL,        -- ex: #20260819-001
  status          bag_status DEFAULT 'OPEN',
  package_count   INT DEFAULT 0,
  stop_count      INT DEFAULT 0,
  pending_count   INT DEFAULT 0,
  duplicate_count INT DEFAULT 0,
  created_by      UUID REFERENCES user_profiles(id),
  started_by      UUID REFERENCES user_profiles(id),
  finished_by     UUID REFERENCES user_profiles(id),
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_bags_organization ON bags(organization_id);
CREATE INDEX idx_bags_status ON bags(status);
CREATE INDEX idx_bags_created_at ON bags(created_at DESC);

-- =============================================
-- STOPS (PARADAS)
-- =============================================
CREATE TYPE stop_status AS ENUM (
  'ACTIVE',
  'LABELS_GENERATED',
  'PRINTED',
  'DELIVERED',
  'PROBLEM'
);

CREATE TABLE stops (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  bag_id          UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
  address_id      UUID REFERENCES addresses(id),
  stop_number     INT NOT NULL,
  order_number    INT NOT NULL,
  package_count   INT DEFAULT 0,
  status          stop_status DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stops_bag ON stops(bag_id);
CREATE INDEX idx_stops_address ON stops(address_id);
CREATE UNIQUE INDEX idx_stops_bag_number ON stops(bag_id, stop_number);

-- =============================================
-- PACKAGES (PACOTES)
-- =============================================
CREATE TYPE package_status AS ENUM (
  'RECEIVED',
  'PROCESSING',
  'IDENTIFIED',
  'PENDING_REVIEW',
  'CONFIRMED',
  'LABEL_GENERATED',
  'PRINTED',
  'DUPLICATE',
  'ERROR'
);

CREATE TYPE scan_method AS ENUM (
  'BARCODE',
  'OCR',
  'MANUAL',
  'IMPORT'
);

CREATE TABLE packages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  bag_id          UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
  stop_id         UUID REFERENCES stops(id),
  address_id      UUID REFERENCES addresses(id),
  barcode         TEXT,
  tracking_code   TEXT,
  order_code      TEXT,
  recipient_name  TEXT,
  status          package_status DEFAULT 'RECEIVED',
  scan_method     scan_method DEFAULT 'BARCODE',
  ocr_confidence  NUMERIC(5,2),
  duplicate_of    UUID REFERENCES packages(id),
  scanned_at      TIMESTAMPTZ DEFAULT NOW(),
  scanned_by      UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packages_bag ON packages(bag_id);
CREATE INDEX idx_packages_barcode ON packages(barcode);
CREATE INDEX idx_packages_stop ON packages(stop_id);
CREATE INDEX idx_packages_status ON packages(status);

-- =============================================
-- SCANS (log de leituras)
-- =============================================
CREATE TABLE scans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  bag_id        UUID REFERENCES bags(id),
  package_id    UUID REFERENCES packages(id),
  raw_code      TEXT NOT NULL,
  result        TEXT,   -- SUCCESS | DUPLICATE | NOT_FOUND | ERROR
  scanned_by    UUID REFERENCES user_profiles(id),
  scanned_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scans_bag ON scans(bag_id);
CREATE INDEX idx_scans_scanned_at ON scans(scanned_at DESC);

-- =============================================
-- OCR RESULTS
-- =============================================
CREATE TABLE ocr_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id      UUID REFERENCES packages(id) ON DELETE CASCADE,
  raw_text        TEXT,
  extracted_data  JSONB DEFAULT '{}',
  confidence      NUMERIC(5,2),
  provider        TEXT DEFAULT 'tesseract',
  processing_ms   INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRINTERS
-- =============================================
CREATE TABLE printers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  model           TEXT,
  protocol        TEXT,   -- ESC/POS | ZPL | RAW
  label_width_mm  INT DEFAULT 100,
  label_height_mm INT DEFAULT 150,
  dpi             INT DEFAULT 203,
  is_default      BOOLEAN DEFAULT FALSE,
  is_thermal      BOOLEAN DEFAULT TRUE,
  agent_printer_name TEXT,    -- nome no SO
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRINT JOBS
-- =============================================
CREATE TYPE print_job_status AS ENUM (
  'QUEUED',
  'PRINTING',
  'PRINTED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE print_jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  bag_id        UUID REFERENCES bags(id),
  package_id    UUID REFERENCES packages(id),
  stop_id       UUID REFERENCES stops(id),
  printer_id    UUID REFERENCES printers(id),
  label_data    JSONB,
  status        print_job_status DEFAULT 'QUEUED',
  error_message TEXT,
  queued_at     TIMESTAMPTZ DEFAULT NOW(),
  printed_at    TIMESTAMPTZ,
  copies        INT DEFAULT 1,
  created_by    UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_print_jobs_bag ON print_jobs(bag_id);
CREATE INDEX idx_print_jobs_status ON print_jobs(status);

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id         UUID REFERENCES user_profiles(id),
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       UUID,
  old_data        JSONB,
  new_data        JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- =============================================
-- SETTINGS
-- =============================================
CREATE TABLE settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) UNIQUE,
  operation_name  TEXT DEFAULT 'Triagem',
  city            TEXT,
  state           CHAR(2),
  auto_print      BOOLEAN DEFAULT FALSE,
  sound_enabled   BOOLEAN DEFAULT TRUE,
  auto_group      BOOLEAN DEFAULT TRUE,
  ocr_min_confidence NUMERIC(5,2) DEFAULT 60,
  label_width_mm  INT DEFAULT 100,
  label_height_mm INT DEFAULT 150,
  label_dpi       INT DEFAULT 203,
  label_fields    JSONB DEFAULT '{"order":true,"stop":true,"quantity":true,"recipient":true,"address":true,"neighborhood":true,"city":true,"zip":true,"barcode":true,"qrcode":true}',
  export_format   TEXT DEFAULT 'CSV',
  retention_days  INT DEFAULT 90,
  circuit_export_fields JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy base: usuário só acessa dados da sua organização
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Bags RLS
CREATE POLICY "bags_org_isolation" ON bags
  FOR ALL USING (organization_id = get_user_org_id());

-- Packages RLS
CREATE POLICY "packages_org_isolation" ON packages
  FOR ALL USING (organization_id = get_user_org_id());

-- Stops RLS
CREATE POLICY "stops_org_isolation" ON stops
  FOR ALL USING (organization_id = get_user_org_id());

-- Addresses RLS
CREATE POLICY "addresses_org_isolation" ON addresses
  FOR ALL USING (organization_id = get_user_org_id());

-- Print jobs RLS
CREATE POLICY "print_jobs_org_isolation" ON print_jobs
  FOR ALL USING (organization_id = get_user_org_id());

-- Audit RLS
CREATE POLICY "audit_org_isolation" ON audit_logs
  FOR ALL USING (organization_id = get_user_org_id());

-- Printers RLS
CREATE POLICY "printers_org_isolation" ON printers
  FOR ALL USING (organization_id = get_user_org_id());

-- Settings RLS
CREATE POLICY "settings_org_isolation" ON settings
  FOR ALL USING (organization_id = get_user_org_id());

-- User profiles RLS
CREATE POLICY "users_own_org" ON user_profiles
  FOR ALL USING (
    organization_id = get_user_org_id()
    OR id = auth.uid()
  );

-- =============================================
-- TRIGGERS: update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bags_updated_at
  BEFORE UPDATE ON bags FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_stops_updated_at
  BEFORE UPDATE ON stops FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- TRIGGER: sync package/stop counts to bag
-- =============================================
CREATE OR REPLACE FUNCTION sync_bag_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_bag_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'packages' THEN
    v_bag_id := COALESCE(NEW.bag_id, OLD.bag_id);
  ELSE
    v_bag_id := COALESCE(NEW.bag_id, OLD.bag_id);
  END IF;

  UPDATE bags SET
    package_count = (SELECT COUNT(*) FROM packages WHERE bag_id = v_bag_id AND status != 'DUPLICATE'),
    stop_count = (SELECT COUNT(*) FROM stops WHERE bag_id = v_bag_id),
    pending_count = (SELECT COUNT(*) FROM packages WHERE bag_id = v_bag_id AND status IN ('PENDING_REVIEW', 'ERROR')),
    duplicate_count = (SELECT COUNT(*) FROM packages WHERE bag_id = v_bag_id AND status = 'DUPLICATE'),
    updated_at = NOW()
  WHERE id = v_bag_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_bag_counts_packages
  AFTER INSERT OR UPDATE OR DELETE ON packages
  FOR EACH ROW EXECUTE FUNCTION sync_bag_counts();

CREATE TRIGGER trg_sync_bag_counts_stops
  AFTER INSERT OR UPDATE OR DELETE ON stops
  FOR EACH ROW EXECUTE FUNCTION sync_bag_counts();

-- =============================================
-- TRIGGER: sync package count to stop
-- =============================================
CREATE OR REPLACE FUNCTION sync_stop_package_count()
RETURNS TRIGGER AS $$
DECLARE
  v_stop_id UUID;
BEGIN
  v_stop_id := COALESCE(NEW.stop_id, OLD.stop_id);
  IF v_stop_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE stops SET
    package_count = (SELECT COUNT(*) FROM packages WHERE stop_id = v_stop_id AND status != 'DUPLICATE'),
    updated_at = NOW()
  WHERE id = v_stop_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_stop_count
  AFTER INSERT OR UPDATE OR DELETE ON packages
  FOR EACH ROW EXECUTE FUNCTION sync_stop_package_count();

-- =====================================================================
--  PAULY DASHBOARD - GESAMTES SICHERES SCHEMA (korrigiert)
--  kompatibel zu Backend /api/*, inkl. MFA + Sessions
-- =====================================================================

-- Für bcrypt (crypt()/gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------
-- Gemeinsame Helper
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- MITARBEITER
-- =====================================================================
CREATE TABLE IF NOT EXISTS mitarbeiter (
  mitarbeiter_id   BIGSERIAL PRIMARY KEY,
  vorname          TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  passwort_hash    TEXT        NOT NULL,
  telefonnummer    TEXT,
  rolle            TEXT        NOT NULL DEFAULT 'aussendienst',

  failed_attempts  INTEGER     NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  last_login       TIMESTAMPTZ,

  mfa_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
  mfa_secret       TEXT,
  mfa_temp_secret  TEXT,
  mfa_enrolled_at  TIMESTAMPTZ,
  mfa_backup_codes JSONB,

  reset_token      TEXT,
  reset_expires    TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT chk_failed_attempts_positive
    CHECK (failed_attempts >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mitarbeiter_email_unique ON mitarbeiter (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_mitarbeiter_last_login ON mitarbeiter (last_login);
CREATE INDEX IF NOT EXISTS idx_mitarbeiter_locked ON mitarbeiter (locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mitarbeiter_reset_token ON mitarbeiter (reset_token) WHERE reset_token IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_mitarbeiter_rolle') THEN
    ALTER TABLE mitarbeiter
      ADD CONSTRAINT chk_mitarbeiter_rolle
      CHECK (rolle IN ('admin','aussendienst','innendienst','support'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_passwort_hash_bcrypt') THEN
    ALTER TABLE mitarbeiter
      ADD CONSTRAINT chk_passwort_hash_bcrypt
      CHECK (passwort_hash ~ '^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$');
  END IF;
END$$;

DROP TRIGGER IF EXISTS trg_mitarbeiter_updated ON mitarbeiter;
CREATE TRIGGER trg_mitarbeiter_updated
  BEFORE UPDATE ON mitarbeiter
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- CUSTOMERS & CONTACTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS customers (
  kunden_id      BIGSERIAL PRIMARY KEY,
  firmenname     TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  strasse        TEXT,
  hausnummer     TEXT,
  plz            TEXT,
  ort            TEXT,
  telefonnummer  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_unique ON customers (LOWER(email));
-- Falls du mehrere gleichnamige Filialen zulassen willst, nächste Zeile auskommentieren:
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_firmenname_unique ON customers (LOWER(firmenname));

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS customer_contacts (
  kontakt_id     BIGSERIAL PRIMARY KEY,
  kunden_id      BIGINT NOT NULL REFERENCES customers(kunden_id) ON DELETE CASCADE,
  vorname        TEXT,
  name           TEXT,
  position       TEXT,
  email          TEXT,
  telefonnummer  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_contacts_kunde_idx ON customer_contacts(kunden_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_email ON customer_contacts (LOWER(email));

DROP TRIGGER IF EXISTS trg_customer_contacts_updated ON customer_contacts;
CREATE TRIGGER trg_customer_contacts_updated
  BEFORE UPDATE ON customer_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ONBOARDING (+ Subtabellen)
-- =====================================================================
CREATE TABLE IF NOT EXISTS onboarding (
  onboarding_id        BIGSERIAL PRIMARY KEY,
  kunde_id             BIGINT NOT NULL REFERENCES customers(kunden_id) ON DELETE CASCADE,
  datum                DATE        NOT NULL DEFAULT CURRENT_DATE,
  status               TEXT        NOT NULL DEFAULT 'neu',
  mitarbeiter_id       BIGINT      NULL REFERENCES mitarbeiter(mitarbeiter_id),
  infrastructure_data  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Status-Constraint für Onboarding: neu, in Arbeit, erledigt
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_onboarding_status') THEN
    ALTER TABLE onboarding DROP CONSTRAINT chk_onboarding_status;
  END IF;
  
  ALTER TABLE onboarding
    ADD CONSTRAINT chk_onboarding_status
    CHECK (status IN ('neu','in Arbeit','erledigt'));
END$$;

-- Indexe
CREATE INDEX IF NOT EXISTS onboarding_kunde_idx ON onboarding(kunde_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_created_at ON onboarding (created_at DESC);

DROP TRIGGER IF EXISTS trg_onboarding_updated ON onboarding;
CREATE TRIGGER trg_onboarding_updated
  BEFORE UPDATE ON onboarding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Netzwerk
CREATE TABLE IF NOT EXISTS onboarding_network (
  network_id              BIGSERIAL PRIMARY KEY,
  onboarding_id           BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  internetzugangsart      TEXT,
  firewall_modell         TEXT,
  feste_ip_vorhanden      BOOLEAN NOT NULL DEFAULT FALSE,
  ip_adresse              TEXT,
  vpn_einwahl_erforderlich BOOLEAN NOT NULL DEFAULT FALSE,
  aktuelle_vpn_user       INTEGER,
  geplante_vpn_user       INTEGER,
  informationen           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS netw_onboarding_idx ON onboarding_network(onboarding_id);

DROP TRIGGER IF EXISTS trg_onboarding_network_updated ON onboarding_network;
CREATE TRIGGER trg_onboarding_network_updated
  BEFORE UPDATE ON onboarding_network
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Hardware
CREATE TABLE IF NOT EXISTS onboarding_hardware (
  hardware_id     BIGSERIAL PRIMARY KEY,
  onboarding_id   BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  typ             TEXT,
  hersteller      TEXT,
  modell          TEXT,
  seriennummer    TEXT,
  standort        TEXT,
  ip              TEXT,
  details_jsonb   JSONB,
  informationen   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hardware_onboarding_idx ON onboarding_hardware(onboarding_id);

DROP TRIGGER IF EXISTS trg_onboarding_hardware_updated ON onboarding_hardware;
CREATE TRIGGER trg_onboarding_hardware_updated
  BEFORE UPDATE ON onboarding_hardware
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Mail
CREATE TABLE IF NOT EXISTS onboarding_mail (
  mail_id         BIGSERIAL PRIMARY KEY,
  onboarding_id   BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  anbieter        TEXT,
  anzahl_postfach INTEGER,
  anzahl_shared   INTEGER,
  gesamt_speicher NUMERIC(12,2),
  pop3_connector  BOOLEAN NOT NULL DEFAULT FALSE,
  mobiler_zugriff BOOLEAN NOT NULL DEFAULT FALSE,
  informationen   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mail_onboarding_idx ON onboarding_mail(onboarding_id);

DROP TRIGGER IF EXISTS trg_onboarding_mail_updated ON onboarding_mail;
CREATE TRIGGER trg_onboarding_mail_updated
  BEFORE UPDATE ON onboarding_mail
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Software + Requirements + Apps
CREATE TABLE IF NOT EXISTS onboarding_software (
  software_id     BIGSERIAL PRIMARY KEY,
  onboarding_id   BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  name            TEXT,
  licenses        INTEGER,
  critical        TEXT,
  description     TEXT,
  virenschutz     TEXT,
  schnittstellen  TEXT,
  wartungsvertrag BOOLEAN,
  migration_support BOOLEAN,
  verwendete_applikationen_text TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS software_onboarding_idx ON onboarding_software(onboarding_id);

DROP TRIGGER IF EXISTS trg_onboarding_software_updated ON onboarding_software;
CREATE TRIGGER trg_onboarding_software_updated
  BEFORE UPDATE ON onboarding_software
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- WICHTIG: NOT NULL entfernt, damit Backend-NULLs erlaubt sind
CREATE TABLE IF NOT EXISTS onboarding_software_requirements (
  requirement_id  BIGSERIAL PRIMARY KEY,
  software_id     BIGINT NOT NULL REFERENCES onboarding_software(software_id) ON DELETE CASCADE,
  type            TEXT,
  detail          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS swreq_software_idx ON onboarding_software_requirements(software_id);

DROP TRIGGER IF EXISTS trg_swreq_updated ON onboarding_software_requirements;
CREATE TRIGGER trg_swreq_updated
  BEFORE UPDATE ON onboarding_software_requirements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS onboarding_software_apps (
  app_id       BIGSERIAL PRIMARY KEY,
  software_id  BIGINT NOT NULL REFERENCES onboarding_software(software_id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS swapps_software_idx ON onboarding_software_apps(software_id);

DROP TRIGGER IF EXISTS trg_swapps_updated ON onboarding_software_apps;
CREATE TRIGGER trg_swapps_updated
  BEFORE UPDATE ON onboarding_software_apps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sonstiges
CREATE TABLE IF NOT EXISTS onboarding_sonstiges (
  sonstiges_id   BIGSERIAL PRIMARY KEY,
  onboarding_id  BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  text           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sonstiges_onboarding_idx ON onboarding_sonstiges(onboarding_id);

DROP TRIGGER IF EXISTS trg_onboarding_sonstiges_updated ON onboarding_sonstiges;
CREATE TRIGGER trg_onboarding_sonstiges_updated
  BEFORE UPDATE ON onboarding_sonstiges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- KALKULATIONEN
-- =====================================================================
CREATE TABLE IF NOT EXISTS kalkulationen (
  kalkulations_id BIGSERIAL PRIMARY KEY,
  kunden_id       BIGINT NOT NULL REFERENCES customers(kunden_id) ON DELETE RESTRICT,
  datum           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  stundensatz     NUMERIC(10,2) NOT NULL,
  mwst_prozent    NUMERIC(5,2)  NOT NULL DEFAULT 19,

  gesamtzeit      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gesamtpreis     NUMERIC(12,2) NOT NULL DEFAULT 0,

  status          TEXT NOT NULL DEFAULT 'neu',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_kalk_status CHECK (status IN ('neu','in Arbeit','erledigt'))
);

CREATE INDEX IF NOT EXISTS kalkulationen_kunde_datum_idx ON kalkulationen (kunden_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_kalkulationen_datum ON kalkulationen (datum DESC);
CREATE INDEX IF NOT EXISTS idx_kalkulationen_status ON kalkulationen (status);

DROP TRIGGER IF EXISTS trg_kalkulationen_updated ON kalkulationen;
CREATE TRIGGER trg_kalkulationen_updated
  BEFORE UPDATE ON kalkulationen
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS kalkulation_positionen (
  position_id        BIGSERIAL PRIMARY KEY,
  kalkulations_id    BIGINT NOT NULL REFERENCES kalkulationen(kalkulations_id) ON DELETE CASCADE,
  section            TEXT,
  beschreibung       TEXT NOT NULL,
  anzahl             NUMERIC(12,2) NOT NULL DEFAULT 1,
  dauer_pro_einheit  NUMERIC(12,2) NOT NULL DEFAULT 0,
  stundensatz        NUMERIC(10,2),
  info               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pos_kalk_idx ON kalkulation_positionen (kalkulations_id);
CREATE INDEX IF NOT EXISTS pos_section_idx ON kalkulation_positionen (section);

DROP TRIGGER IF EXISTS trg_kalk_pos_updated ON kalkulation_positionen;
CREATE TRIGGER trg_kalk_pos_updated
  BEFORE UPDATE ON kalkulation_positionen
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION kalkulation_recalc(p_kalk_id BIGINT) RETURNS VOID AS $$
DECLARE
  v_std   NUMERIC(10,2);
  v_mwst  NUMERIC(5,2);
  v_hours NUMERIC(12,2);
  v_netto NUMERIC(12,2);
BEGIN
  SELECT k.stundensatz, k.mwst_prozent
    INTO v_std, v_mwst
  FROM kalkulationen k
  WHERE k.kalkulations_id = p_kalk_id
  FOR UPDATE;

  SELECT
    COALESCE(SUM(p.anzahl * p.dauer_pro_einheit), 0),
    COALESCE(SUM( (COALESCE(p.stundensatz, v_std)) * (p.anzahl * p.dauer_pro_einheit) ), 0)
  INTO v_hours, v_netto
  FROM kalkulation_positionen p
  WHERE p.kalkulations_id = p_kalk_id;

  UPDATE kalkulationen
     SET gesamtzeit  = v_hours,
         gesamtpreis = ROUND( v_netto * (1 + (v_mwst/100.0)), 2 ),
         updated_at  = NOW()
   WHERE kalkulations_id = p_kalk_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION kalkulation_recalc_trigger() RETURNS TRIGGER AS $$
DECLARE v_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_id := OLD.kalkulations_id; ELSE v_id := NEW.kalkulations_id; END IF;
  PERFORM kalkulation_recalc(v_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pos_aiud_recalc ON kalkulation_positionen;
CREATE TRIGGER trg_pos_aiud_recalc
AFTER INSERT OR UPDATE OR DELETE ON kalkulation_positionen
FOR EACH ROW EXECUTE FUNCTION kalkulation_recalc_trigger();

CREATE OR REPLACE FUNCTION kalkulation_header_recalc() RETURNS TRIGGER AS $$
BEGIN
  PERFORM kalkulation_recalc(NEW.kalkulations_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kalk_header_recalc ON kalkulationen;
CREATE TRIGGER trg_kalk_header_recalc
AFTER UPDATE OF stundensatz, mwst_prozent ON kalkulationen
FOR EACH ROW EXECUTE FUNCTION kalkulation_header_recalc();

CREATE OR REPLACE VIEW v_kalkulationen_berechnet AS
SELECT
  k.*,
  (
    SELECT COALESCE(SUM( (COALESCE(p.stundensatz, k.stundensatz)) * (p.anzahl * p.dauer_pro_einheit) ), 0)
    FROM kalkulation_positionen p
    WHERE p.kalkulations_id = k.kalkulations_id
  ) AS sum_netto,
  ROUND(
    (
      SELECT COALESCE(SUM( (COALESCE(p.stundensatz, k.stundensatz)) * (p.anzahl * p.dauer_pro_einheit) ), 0)
      FROM kalkulation_positionen p
      WHERE p.kalkulations_id = k.kalkulations_id
    ) * (k.mwst_prozent/100.0), 2
  ) AS sum_mwst,
  k.gesamtpreis AS sum_brutto
FROM kalkulationen k;

-- =====================================================================
-- AUDIT & SESSIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id    BIGSERIAL PRIMARY KEY,
  table_name  VARCHAR(50) NOT NULL,
  operation   VARCHAR(10) NOT NULL,
  record_id   BIGINT,
  user_id     BIGINT REFERENCES mitarbeiter(mitarbeiter_id),
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id          BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES mitarbeiter(mitarbeiter_id) ON DELETE CASCADE,
  refresh_token_hash  TEXT   NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address          INET,
  user_agent          TEXT,
  is_revoked          BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions (refresh_token_hash);

-- =====================================================================
-- SICHERHEITS-VIEWS
-- =====================================================================
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  m.mitarbeiter_id,
  m.email,
  m.vorname,
  m.name,
  m.rolle,
  m.mfa_enabled,
  m.failed_attempts,
  (m.locked_until IS NOT NULL AND m.locked_until > NOW()) AS is_locked,
  m.last_login,
  m.created_at,
  COUNT(s.session_id) AS active_sessions
FROM mitarbeiter m
LEFT JOIN user_sessions s
  ON m.mitarbeiter_id = s.user_id
 AND s.expires_at > NOW()
 AND s.is_revoked = FALSE
GROUP BY m.mitarbeiter_id, m.email, m.vorname, m.name, m.rolle,
         m.mfa_enabled, m.failed_attempts, m.locked_until,
         m.last_login, m.created_at;

CREATE OR REPLACE VIEW security_events AS
SELECT 
  'login_failure' AS event_type,
  email AS user_identifier,
  failed_attempts::text AS details,
  updated_at AS event_time
FROM mitarbeiter 
WHERE failed_attempts > 0

UNION ALL

SELECT 
  'account_locked' AS event_type,
  email AS user_identifier,
  'Account locked until ' || locked_until::text AS details,
  locked_until AS event_time
FROM mitarbeiter 
WHERE locked_until IS NOT NULL AND locked_until > NOW();

-- =====================================================================
-- WARTUNG
-- =====================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() OR is_revoked = TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION security_maintenance()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW() OR is_revoked = TRUE;
  DELETE FROM audit_log     WHERE created_at < NOW() - INTERVAL '1 year';
  UPDATE mitarbeiter 
     SET locked_until = NULL, failed_attempts = 0 
   WHERE locked_until IS NOT NULL AND locked_until < NOW();
  RAISE NOTICE 'Security maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- NORMALISIERUNG + DEV-ADMIN
-- =====================================================================
UPDATE mitarbeiter SET email = LOWER(email) WHERE email <> LOWER(email);
UPDATE customers SET email = LOWER(email) WHERE email <> LOWER(email);
UPDATE customer_contacts
   SET email = LOWER(email)
 WHERE email IS NOT NULL AND email <> LOWER(email);

INSERT INTO mitarbeiter (vorname, name, email, passwort_hash, telefonnummer, rolle)
SELECT 'System','Admin','admin@pauly-dashboard.local',
       crypt('change_me_immediately', gen_salt('bf', 12)),
       '', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM mitarbeiter WHERE LOWER(email)=LOWER('admin@pauly-dashboard.local')
);
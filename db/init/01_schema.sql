
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
--  KUNDEN & ANSPRECHPARTNER (Onboarding Step 1)
-- =====================================================================

CREATE TABLE IF NOT EXISTS mitarbeiter (
  mitarbeiter_id SERIAL PRIMARY KEY,
  vorname        TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,
  passwort       TEXT        NOT NULL,         -- vorerst Klartext (später hash)
  telefonnummer  TEXT,
  rolle          TEXT        NOT NULL DEFAULT 'aussendienst',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  kunden_id      BIGSERIAL PRIMARY KEY,
  firmenname     TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  strasse        TEXT,
  hausnummer     TEXT,
  plz           TEXT,
  ort           TEXT,
  telefonnummer  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_customers_updated
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ansprechpartner (aus onboardingCustomerData.ansprechpartner)
-- Dein aktuelles UI zeigt Vorname/Name/Position; E-Mail/Tel sind optional vorgesehen.
CREATE TABLE customer_contacts (
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

CREATE INDEX customer_contacts_kunde_idx ON customer_contacts(kunden_id);

CREATE TRIGGER trg_customer_contacts_updated
BEFORE UPDATE ON customer_contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
--  ONBOARDING (Step 2/3): Hauptentität + Teilbereiche
-- =====================================================================

-- Ein Onboarding-Eintrag je Kunde (du postest { kunde_id, infrastructure_data })
CREATE TABLE onboarding (
  onboarding_id  BIGSERIAL PRIMARY KEY,
  kunden_id      BIGINT NOT NULL REFERENCES customers(kunden_id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX onboarding_kunde_idx ON onboarding(kunden_id);

CREATE TRIGGER trg_onboarding_updated
BEFORE UPDATE ON onboarding
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------- Netzwerk --------
CREATE TABLE onboarding_netzwerk (
  netzwerk_id              BIGSERIAL PRIMARY KEY,
  onboarding_id            BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  internetzugangsart       TEXT,               -- DSL/VDSL/Glasfaser/...
  firewall_modell          TEXT,
  feste_ip_vorhanden       BOOLEAN NOT NULL DEFAULT FALSE,
  ip_adresse               TEXT,
  vpn_einwahl_erforderlich BOOLEAN NOT NULL DEFAULT FALSE,
  aktuelle_vpn_user        INTEGER,
  geplante_vpn_user        INTEGER,
  informationen            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX netzwerk_onboarding_idx ON onboarding_netzwerk(onboarding_id);

CREATE TRIGGER trg_onboarding_netzwerk_updated
BEFORE UPDATE ON onboarding_netzwerk
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------- Hardware (Liste) --------
-- Frontend: infrastructureData.hardware.hardwareList = Array
CREATE TABLE onboarding_hardware (
  hardware_id     BIGSERIAL PRIMARY KEY,
  onboarding_id   BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  typ             TEXT,   -- z.B. Server/NAS/Firewall/...
  hersteller      TEXT,
  modell          TEXT,
  seriennummer    TEXT,
  standort        TEXT,
  ip              TEXT,
  details_jsonb   TEXT,   -- im UI als Freitext-Textarea benannt; Typ TEXT lässt alles zu
  informationen   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX hardware_onboarding_idx ON onboarding_hardware(onboarding_id);

CREATE TRIGGER trg_onboarding_hardware_updated
BEFORE UPDATE ON onboarding_hardware
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------- Mail --------
CREATE TABLE onboarding_mail (
  mail_id         BIGSERIAL PRIMARY KEY,
  onboarding_id   BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  anbieter        TEXT,            -- Exchange/Office365/Gmail/IMAP/Other
  anzahl_postfach INTEGER,
  anzahl_shared   INTEGER,
  gesamt_speicher NUMERIC(12,2),   -- GB
  pop3_connector  BOOLEAN NOT NULL DEFAULT FALSE,
  mobiler_zugriff BOOLEAN NOT NULL DEFAULT FALSE,
  informationen   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX mail_onboarding_idx ON onboarding_mail(onboarding_id);

CREATE TRIGGER trg_onboarding_mail_updated
BEFORE UPDATE ON onboarding_mail
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------- Software --------
-- Mit Requirements (Array) & Applikationen (Array)
CREATE TABLE onboarding_software (
  software_id     BIGSERIAL PRIMARY KEY,
  onboarding_id   BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  name            TEXT,
  licenses        INTEGER,
  critical        TEXT,            -- 'hoch' | 'niedrig' (UI liefert diese Strings)
  description     TEXT,
  -- optionale Felder, die Step3 anzeigt (UI hat derzeit keine Inputs dafür):
  virenschutz     TEXT,
  schnittstellen  TEXT,
  wartungsvertrag BOOLEAN,
  migration_support BOOLEAN,
  verwendete_applikationen_text TEXT,  -- Freitext aus UI
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX software_onboarding_idx ON onboarding_software(onboarding_id);

CREATE TRIGGER trg_onboarding_software_updated
BEFORE UPDATE ON onboarding_software
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Software: Anforderungen (requirements: [{type, detail}])
CREATE TABLE onboarding_software_requirements (
  requirement_id  BIGSERIAL PRIMARY KEY,
  software_id     BIGINT NOT NULL REFERENCES onboarding_software(software_id) ON DELETE CASCADE,
  type            TEXT NOT NULL,  -- CPU/RAM/Speicher/Betriebssystem/Zielumgebung/Netzwerk/Sonstiges
  detail          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX swreq_software_idx ON onboarding_software_requirements(software_id);

CREATE TRIGGER trg_swreq_updated
BEFORE UPDATE ON onboarding_software_requirements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Software: Verwendete Applikationen (Liste)
CREATE TABLE onboarding_software_apps (
  app_id       BIGSERIAL PRIMARY KEY,
  software_id  BIGINT NOT NULL REFERENCES onboarding_software(software_id) ON DELETE CASCADE,
  name         TEXT NOT NULL,  -- Ein Eintrag pro Zeile aus deinem Textfeld (bereits im FE gesplittet)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX swapps_software_idx ON onboarding_software_apps(software_id);

CREATE TRIGGER trg_swapps_updated
BEFORE UPDATE ON onboarding_software_apps
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------- Backup --------
CREATE TABLE onboarding_backup (
  backup_id      BIGSERIAL PRIMARY KEY,
  onboarding_id  BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  tool           TEXT,              -- Veeam/Acronis/Borg/Custom
  interval       TEXT,              -- täglich/wöchentlich/monatlich/stündlich
  retention      TEXT,              -- z. B. "30 Tage"
  location       TEXT,              -- NAS/Cloud/...
  size           NUMERIC(12,2),     -- GB
  info           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX backup_onboarding_idx ON onboarding_backup(onboarding_id);

CREATE TRIGGER trg_onboarding_backup_updated
BEFORE UPDATE ON onboarding_backup
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------- Sonstiges --------
CREATE TABLE onboarding_sonstiges (
  sonstiges_id   BIGSERIAL PRIMARY KEY,
  onboarding_id  BIGINT NOT NULL REFERENCES onboarding(onboarding_id) ON DELETE CASCADE,
  text           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sonstiges_onboarding_idx ON onboarding_sonstiges(onboarding_id);

CREATE TRIGGER trg_onboarding_sonstiges_updated
BEFORE UPDATE ON onboarding_sonstiges
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
--  CALCULATIONSECTION (Kalkulations-Kopf + Positionen)
-- =====================================================================

-- Kopf (Standard-Stundensatz + MwSt; Summen werden automatisch gepflegt)
CREATE TABLE kalkulationen (
  kalkulations_id BIGSERIAL PRIMARY KEY,
  kunden_id       BIGINT NOT NULL REFERENCES customers(kunden_id) ON DELETE RESTRICT,
  datum           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  stundensatz     NUMERIC(10,2) NOT NULL,
  mwst_prozent    NUMERIC(5,2)  NOT NULL DEFAULT 19,

  gesamtzeit      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- Summe Stunden
  gesamtpreis     NUMERIC(12,2) NOT NULL DEFAULT 0,   -- Brutto

  status          TEXT NOT NULL DEFAULT 'neu',        -- 'neu' | 'in Arbeit' | 'erledigt'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_status CHECK (status IN ('neu','in Arbeit','erledigt'))
);

CREATE INDEX kalkulationen_kunde_datum_idx ON kalkulationen (kunden_id, datum DESC);

CREATE TRIGGER trg_kalkulationen_updated
BEFORE UPDATE ON kalkulationen
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Positionen (optional: section für Gruppen)
CREATE TABLE kalkulation_positionen (
  position_id        BIGSERIAL PRIMARY KEY,
  kalkulations_id    BIGINT NOT NULL REFERENCES kalkulationen(kalkulations_id) ON DELETE CASCADE,

  section            TEXT,               -- z. B. "Vorbereitende Maßnahmen"
  beschreibung       TEXT NOT NULL,      -- Tätigkeit
  anzahl             NUMERIC(12,2) NOT NULL DEFAULT 1,
  dauer_pro_einheit  NUMERIC(12,2) NOT NULL DEFAULT 0, -- Std je Einheit
  stundensatz        NUMERIC(10,2),      -- NULL => Kopf-Stundensatz verwenden
  info               TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pos_kalk_idx     ON kalkulation_positionen (kalkulations_id);
CREATE INDEX pos_section_idx  ON kalkulation_positionen (section);

CREATE TRIGGER trg_kalk_pos_updated
BEFORE UPDATE ON kalkulation_positionen
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Summen-Neuberechnung
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
DECLARE
  v_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id := OLD.kalkulations_id;
  ELSE
    v_id := NEW.kalkulations_id;
  END IF;

  PERFORM kalkulation_recalc(v_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pos_aiud_recalc
AFTER INSERT OR UPDATE OR DELETE ON kalkulation_positionen
FOR EACH ROW EXECUTE FUNCTION kalkulation_recalc_trigger();

CREATE OR REPLACE FUNCTION kalkulation_header_recalc() RETURNS TRIGGER AS $$
BEGIN
  PERFORM kalkulation_recalc(NEW.kalkulations_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kalk_header_recalc
AFTER UPDATE OF stundensatz, mwst_prozent ON kalkulationen
FOR EACH ROW EXECUTE FUNCTION kalkulation_header_recalc();

-- Komfort-View (Netto/MwSt/Brutto live)
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


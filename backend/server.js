require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

const { pool } = require('./db'); // -> PG-Pool

// ---------- PDF (vollständige PDFs) ----------
let PDFDocument;
try {
  PDFDocument = require('pdfkit'); // npm i pdfkit
} catch (_) {
  PDFDocument = null; // wenn nicht installiert, versenden wir ohne PDF
}

// ---------- Konfiguration ----------
const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || '';            // in DEV leer -> "dev-Modus"
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5000,http://localhost:3001')
  .split(',')
  .map(s => s.trim());

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true })); // Für Form-Data Unterstützung
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  },
  credentials: true,
}));

// Rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });
app.use('/api/auth/', authLimiter);

// ---------- Mail-Transport ----------
const emailConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
};
const transporter = nodemailer.createTransport(emailConfig);
const SMTP_FROM = process.env.SMTP_FROM || (process.env.SMTP_USER || 'no-reply@example.com');

// ---------- Utils ----------
const MFA_ISSUER = process.env.MFA_ISSUER || 'Pauly Dashboard';
const esc = (v) => (v === undefined || v === null ? '' : String(v));
const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const generateBackupCodes = (n = 10) =>
  Array.from({ length: n }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
const signAccess = (payload) =>
  JWT_SECRET ? jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }) : 'dev';
const signRefresh = (payload) =>
  (JWT_REFRESH_SECRET && JWT_SECRET) ? jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' }) : 'dev';

function verifyToken(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;

  // DEV-Durchlass, wenn keine Secrets gesetzt sind
  if (!JWT_SECRET) {
    req.user = req.user || {};
    return next();
  }

  if (!token) return res.status(401).json({ error: 'Kein Token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Ungültiger Token' });
  }
}

const requireRole = (...roles) => (req, res, next) => {
  const r = req.user?.rolle;
  if (!roles.length) return next();
  if (r && roles.includes(r)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

const toBool = (v) => !!(v === true || v === 'true' || v === 1 || v === '1');

// ---------- Health ----------
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// ============================================================
// =                        AUTH                              =
// ============================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, vorname, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email/Passwort fehlt' });

    const hash = await bcrypt.hash(String(password), 10);
    const { rows } = await pool.query(
      `INSERT INTO mitarbeiter (email, passwort_hash, vorname, name, rolle)
       VALUES (LOWER($1), $2, $3, $4, 'innendienst')
       RETURNING mitarbeiter_id, email, rolle, vorname, name, mfa_enabled`,
      [email, hash, vorname || null, name || null]
    );

    const user = rows[0];
    const payload = { mitarbeiter_id: user.mitarbeiter_id, email: user.email, rolle: user.rolle };
    return res.json({
      message: 'Registriert',
      accessToken: signAccess(payload),
      refreshToken: signRefresh(payload),
      user: {
        mitarbeiter_id: user.mitarbeiter_id,
        email: user.email,
        rolle: user.rolle,
        vorname: user.vorname,
        name: user.name,
        mfa_enabled: user.mfa_enabled,
      }
    });
  } catch (e) {
    if (String(e.message).includes('unique')) {
      return res.status(409).json({ error: 'E-Mail bereits vergeben' });
    }
    console.error('register error:', e);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email/Passwort fehlt' });

    const { rows } = await pool.query(
      `SELECT mitarbeiter_id, email, passwort_hash, rolle, vorname, name, mfa_enabled
         FROM mitarbeiter WHERE LOWER(email)=LOWER($1)`,
      [email]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const ok = await bcrypt.compare(String(password), String(u.passwort_hash || ''));
    if (!ok) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const payload = { mitarbeiter_id: u.mitarbeiter_id, email: u.email, rolle: u.rolle };

    if (u.mfa_enabled) {
      return res.json({
        requireMfa: true,
        user_id: u.mitarbeiter_id,
        user: { mitarbeiter_id: u.mitarbeiter_id, email: u.email, rolle: u.rolle, vorname: u.vorname, name: u.name, mfa_enabled: true }
      });
    }

    return res.json({
      message: 'Login erfolgreich',
      accessToken: signAccess(payload),
      refreshToken: signRefresh(payload),
      user: { mitarbeiter_id: u.mitarbeiter_id, email: u.email, rolle: u.rolle, vorname: u.vorname, name: u.name, mfa_enabled: false },
    });
  } catch (e) {
    console.error('login error:', e);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/auth/mfa/verify', async (req, res) => {
  try {
    const { user_id, token } = req.body || {};
    const userId = Number(user_id);
    const code = String(token || '').trim();
    if (!userId || !code) return res.status(400).json({ error: 'user_id oder token fehlt' });

    const { rows } = await pool.query(
      `SELECT mitarbeiter_id, email, rolle, vorname, name, mfa_secret, mfa_backup_codes
         FROM mitarbeiter WHERE mitarbeiter_id=$1`,
      [userId]
    );
    const u = rows[0];
    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });

    let ok = false;
    if (u.mfa_secret) {
      ok = speakeasy.totp.verify({ secret: String(u.mfa_secret), encoding: 'base32', token: code, window: 1 });
    }
    if (!ok && Array.isArray(u.mfa_backup_codes)) {
      const list = u.mfa_backup_codes.map(String);
      const idx = list.findIndex((c) => c.toUpperCase() === code.toUpperCase());
      if (idx >= 0) {
        ok = true;
        list.splice(idx, 1);
        await pool.query(`UPDATE mitarbeiter SET mfa_backup_codes=$1, updated_at=NOW() WHERE mitarbeiter_id=$2`, [JSON.stringify(list), userId]);
      }
    }
    if (!ok) return res.status(401).json({ error: 'MFA-Code ungültig' });

    const payload = { mitarbeiter_id: u.mitarbeiter_id, email: u.email, rolle: u.rolle };
    return res.json({
      message: 'Login erfolgreich',
      accessToken: signAccess(payload),
      refreshToken: signRefresh(payload),
      user: { mitarbeiter_id: u.mitarbeiter_id, email: u.email, rolle: u.rolle, vorname: u.vorname, name: u.name, mfa_enabled: true }
    });
  } catch (e) {
    console.error('mfa verify error:', e);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});

// --- MFA SETUP: START (email-Fallback) ---
app.post('/api/auth/mfa/setup/start', verifyToken, async (req, res) => {
  try {
    let userId = Number(req.user?.mitarbeiter_id || req.body?.user_id);
    let email = (req.user?.email || req.body?.email || '').trim().toLowerCase();

    // Falls keine user_id übergeben wurde, per E-Mail auflösen
    if (!userId && email) {
      const lookup = await pool.query(
        `SELECT mitarbeiter_id, email FROM mitarbeiter WHERE LOWER(email)=LOWER($1)`,
        [email]
      );
      if (lookup.rows[0]) userId = lookup.rows[0].mitarbeiter_id;
    }

    if (!userId) {
      return res.status(400).json({ error: 'user_id oder email fehlt' });
    }

    // E-Mail für den QR aus DB holen (vertrauenswürdig)
    const { rows } = await pool.query(
      `SELECT email FROM mitarbeiter WHERE mitarbeiter_id=$1`,
      [userId]
    );
    const u = rows[0];
    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });

    const secret = speakeasy.generateSecret({ length: 20 });
    const otpauth =
      secret.otpauth_url ||
      `otpauth://totp/${encodeURIComponent(MFA_ISSUER)}:${encodeURIComponent(u.email)}?secret=${secret.base32}&issuer=${encodeURIComponent(MFA_ISSUER)}&algorithm=SHA1&digits=6&period=30`;

    const qrDataUrl = await QRCode.toDataURL(otpauth);

    await pool.query(
      `UPDATE mitarbeiter SET mfa_temp_secret=$1, updated_at=NOW() WHERE mitarbeiter_id=$2`,
      [secret.base32, userId]
    );

    return res.json({ qrDataUrl, secret: secret.base32, user_id: userId });
  } catch (e) {
    console.error('mfa setup start error:', e);
    return res.status(500).json({ error: 'Serverfehler bei MFA-Start' });
  }
});

// --- MFA SETUP: VERIFY (email-Fallback) ---
app.post('/api/auth/mfa/setup/verify', verifyToken, async (req, res) => {
  try {
    let userId = Number(req.user?.mitarbeiter_id || req.body?.user_id);
    const token = String(req.body?.token || '').trim();
    let email = (req.user?.email || req.body?.email || '').trim().toLowerCase();

    if (!userId && email) {
      const lookup = await pool.query(
        `SELECT mitarbeiter_id FROM mitarbeiter WHERE LOWER(email)=LOWER($1)`,
        [email]
      );
      if (lookup.rows[0]) userId = lookup.rows[0].mitarbeiter_id;
    }

    if (!userId || token.length !== 6) {
      return res.status(400).json({ error: 'Ungültige Eingaben (user_id/email oder token fehlt/ungültig)' });
    }

    const { rows } = await pool.query(
      `SELECT mfa_temp_secret FROM mitarbeiter WHERE mitarbeiter_id=$1`,
      [userId]
    );
    const temp = rows[0]?.mfa_temp_secret;
    if (!temp) return res.status(400).json({ error: 'Kein MFA-Setup in Vorbereitung' });

    const ok = speakeasy.totp.verify({ secret: temp, encoding: 'base32', token, window: 1 });
    if (!ok) return res.status(400).json({ error: 'Code ungültig' });

    const backup = generateBackupCodes(10);
    await pool.query(
      `UPDATE mitarbeiter
         SET mfa_enabled=TRUE, mfa_secret=$1, mfa_temp_secret=NULL, mfa_backup_codes=$2::jsonb, mfa_enrolled_at=NOW(), updated_at=NOW()
       WHERE mitarbeiter_id=$3`,
      [temp, JSON.stringify(backup), userId]
    );

    return res.json({ ok: true, backup_codes: backup, user_id: userId });
  } catch (e) {
    console.error('mfa setup verify error:', e);
    return res.status(500).json({ error: 'Serverfehler bei MFA-Verifizierung' });
  }
});

app.post('/api/auth/change-password', verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user?.mitarbeiter_id || req.body?.user_id);
    const { oldPassword, newPassword } = req.body || {};
    if (!userId || !oldPassword || !newPassword) return res.status(400).json({ error: 'Eingaben unvollständig' });

    const { rows } = await pool.query(`SELECT passwort_hash FROM mitarbeiter WHERE mitarbeiter_id=$1`, [userId]);
    const hash = rows[0]?.passwort_hash;
    if (!hash) return res.status(404).json({ error: 'User nicht gefunden' });

    const ok = await bcrypt.compare(String(oldPassword), String(hash));
    if (!ok) return res.status(401).json({ error: 'Altes Passwort falsch' });

    const newHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query(`UPDATE mitarbeiter SET passwort_hash=$1, updated_at=NOW() WHERE mitarbeiter_id=$2`, [newHash, userId]);
    return res.json({ message: 'Passwort aktualisiert' });
  } catch (e) {
    console.error('change password error:', e);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.json({ message: 'Wenn die E-Mail existiert, wurde eine Nachricht gesendet.' });

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h

    await pool.query(`UPDATE mitarbeiter SET reset_token=$1, reset_token_expires=$2 WHERE LOWER(email)=LOWER($3)`, [token, expires, email]);

    if (process.env.SMTP_HOST) {
      const resetLink = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(token)}`;
      await transporter.sendMail({ from: SMTP_FROM, to: email, subject: 'Passwort zurücksetzen', text: `Zum Zurücksetzen des Passworts: ${resetLink}\n(Gültig: 1 Stunde)` });
    }
    return res.json({ message: 'Wenn die E-Mail existiert, wurde eine Nachricht gesendet.' });
  } catch (e) {
    console.error('forgot-password error:', e);
    return res.json({ message: 'Wenn die E-Mail existiert, wurde eine Nachricht gesendet.' });
  }
});

app.post('/api/auth/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Token fehlt' });

    const { rows } = await pool.query(`SELECT mitarbeiter_id, reset_token_expires FROM mitarbeiter WHERE reset_token=$1`, [token]);
    const r = rows[0];
    if (!r) return res.status(400).json({ error: 'Ungültiger Token' });
    if (r.reset_token_expires && new Date(r.reset_token_expires) < new Date()) return res.status(400).json({ error: 'Token abgelaufen' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('validate-reset-token error:', e);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Eingaben unvollständig' });

    const { rows } = await pool.query(`SELECT mitarbeiter_id, reset_token_expires FROM mitarbeiter WHERE reset_token=$1`, [token]);
    const u = rows[0];
    if (!u) return res.status(400).json({ error: 'Ungültiger Token' });
    if (u.reset_token_expires && new Date(u.reset_token_expires) < new Date()) return res.status(400).json({ error: 'Token abgelaufen' });

    const newHash = await bcrypt.hash(String(password), 10);
    await pool.query(`UPDATE mitarbeiter SET passwort_hash=$1, reset_token=NULL, reset_token_expires=NULL, updated_at=NOW() WHERE mitarbeiter_id=$2`, [newHash, u.mitarbeiter_id]);
    return res.json({ message: 'Passwort gesetzt' });
  } catch (e) {
    console.error('reset-password error:', e);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================================
// =                      KUNDEN                              =
// ============================================================

app.get('/api/customers', verifyToken, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.kunden_id, c.firmenname, c.email, c.plz, c.ort, c.strasse, c.hausnummer,
             COALESCE(cc.cnt,0)::int AS contact_count,
             COALESCE(ob.cnt,0)::int AS onboarding_count
        FROM customers c
        LEFT JOIN (SELECT kunden_id, COUNT(*) AS cnt FROM customer_contacts GROUP BY kunden_id) cc ON cc.kunden_id = c.kunden_id
        LEFT JOIN (SELECT kunde_id, COUNT(*) AS cnt FROM onboarding GROUP BY kunde_id) ob ON ob.kunde_id = c.kunden_id
      ORDER BY c.firmenname ASC
    `);
    res.json(rows);
  } catch (e) {
    console.error('GET /customers error:', e);
    res.status(500).json({ error: 'Fehler beim Laden der Kunden' });
  }
});

app.get('/api/customers/:id(\\d+)', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(`SELECT * FROM customers WHERE kunden_id=$1`, [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Kunde nicht gefunden' });
    res.json(rows[0]);
  } catch (e) {
    console.error('GET /customers/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

app.post('/api/customers', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const { firmenname, email, strasse, hausnummer, plz, ort } = body;
    if (!firmenname) return res.status(400).json({ error: 'firmenname fehlt' });

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO customers (firmenname, email, strasse, hausnummer, plz, ort)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING kunden_id`,
      [firmenname, email || null, strasse || null, hausnummer || null, plz || null, ort || null]
    );
    const kundenId = rows[0].kunden_id;

    // (Optional) gleich ein Onboarding mit Infrastruktur anlegen
    const infra = body.infrastruktur || body.infrastructure_data;
    if (infra) {
      const { status = 'neu', datum = new Date() } = infra;
      const { rows: obRows } = await client.query(
        `INSERT INTO onboarding (kunde_id, status, datum) VALUES ($1,$2,$3) RETURNING onboarding_id`,
        [kundenId, status, datum]
      );
      const onboardingId = obRows[0].onboarding_id;

      const network = infra.network || infra.netzwerk;
      if (network) {
        await client.query(
          `INSERT INTO onboarding_network
           (onboarding_id, internetzugangsart, firewall_modell, feste_ip_vorhanden, ip_adresse, vpn_einwahl_erforderlich, aktuelle_vpn_user, geplante_vpn_user, informationen)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [onboardingId,
           network.internetzugangsart || null, network.firewall_modell || null, !!network.feste_ip_vorhanden, network.ip_adresse || null,
           !!network.vpn_einwahl_erforderlich, Number(network.aktuelle_vpn_user)||0, Number(network.geplante_vpn_user)||0, network.informationen || null]
        );
      }
      if (Array.isArray(infra.hardware)) {
        for (const h of infra.hardware) {
          await client.query(
            `INSERT INTO onboarding_hardware (onboarding_id, typ, hersteller, modell, seriennummer, standort, ip, informationen)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [onboardingId, h.typ || null, h.hersteller || null, h.modell || null, h.seriennummer || null, h.standort || null, h.ip || null, h.informationen || null]
          );
        }
      }
      if (Array.isArray(infra.software)) {
        for (const s of infra.software) {
          const { rows: sRows } = await client.query(
            `INSERT INTO onboarding_software (onboarding_id, name, licenses, critical, description, virenschutz, schnittstellen, wartungsvertrag, migration_support)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING software_id`,
            [onboardingId, s.name || null, s.licenses || null, s.critical || null, s.description || null, s.virenschutz || null, s.schnittstellen || null, !!s.wartungsvertrag, !!s.migration_support]
          );
          const softwareId = sRows[0].software_id;
          if (Array.isArray(s.apps)) {
            for (const a of s.apps) {
              await client.query(`INSERT INTO onboarding_software_apps (software_id, name) VALUES ($1,$2)`, [softwareId, a.name || null]);
            }
          }
          if (Array.isArray(s.requirements)) {
            for (const r of s.requirements) {
              await client.query(
                `INSERT INTO onboarding_software_requirements (software_id, type, detail) VALUES ($1,$2,$3)`,
                [softwareId, r.type || null, r.detail || null]
              );
            }
          }
        }
      }
      if (infra.mail) {
        const m = infra.mail;
        await client.query(
          `INSERT INTO onboarding_mail (onboarding_id, anbieter, anzahl_postfach, anzahl_shared, gesamt_speicher, pop3_connector, mobiler_zugriff, informationen)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [onboardingId, m.anbieter || null, Number(m.anzahl_postfach)||0, Number(m.anzahl_shared)||0, Number(m.gesamt_speicher)||0, !!m.pop3_connector, !!m.mobiler_zugriff, m.informationen || null]
        );
      }
      if (infra.backup) {
        const b = infra.backup;
        await client.query(
          `INSERT INTO onboarding_backup (onboarding_id, tool, interval, retention, location, size, info)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [onboardingId, b.tool || null, b.interval || null, b.retention || null, b.location || null, Number(b.size)||0, b.info || null]
        );
      }
      if (infra.sonstiges) {
        await client.query(`INSERT INTO onboarding_sonstiges (onboarding_id, text) VALUES ($1,$2)`, [onboardingId, infra.sonstiges.text || null]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Kunde angelegt', kunden_id: kundenId });
  } catch (e) {
    await pool.query('ROLLBACK'); // wird unten korrigiert, falls client vorhanden
    console.error('POST /customers error:', e);
    res.status(500).json({ error: 'Fehler beim Anlegen' });
  } finally {
    try { await client.query('ROLLBACK'); } catch {}
    try { client.release(); } catch {}
  }
});

// ============================================================
// =                    ONBOARDING / PROJEKTE                 =
// ============================================================

app.get('/api/onboarding/projects', verifyToken, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        o.onboarding_id, o.kunde_id, o.status, o.created_at, o.updated_at, o.datum,
        c.firmenname, c.email, c.plz, c.ort,
        COUNT(DISTINCT oh.hardware_id)::int AS hardware_count,
        COUNT(DISTINCT os.software_id)::int AS software_count,
        (COUNT(onw.network_id) > 0)         AS has_network
      FROM onboarding o
      JOIN customers c            ON c.kunden_id      = o.kunde_id
      LEFT JOIN onboarding_hardware  oh  ON oh.onboarding_id = o.onboarding_id
      LEFT JOIN onboarding_software  os  ON os.onboarding_id = o.onboarding_id
      LEFT JOIN onboarding_network   onw ON onw.onboarding_id= o.onboarding_id
      GROUP BY o.onboarding_id, c.firmenname, c.email, c.plz, c.ort
      ORDER BY o.created_at DESC, o.onboarding_id DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error('GET /onboarding/projects error:', e);
    res.status(500).json({ error: 'Fehler beim Laden der Projekte' });
  }
});

app.get('/api/onboarding/:id(\\d+)', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { rows: obRows } = await pool.query(`SELECT * FROM onboarding WHERE onboarding_id=$1`, [id]);
    const ob = obRows[0];
    if (!ob) return res.status(404).json({ error: 'Onboarding nicht gefunden' });

    const [netz, hw, sw, mail, backup, sonst] = await Promise.all([
      pool.query(`SELECT * FROM onboarding_network  WHERE onboarding_id=$1 LIMIT 1`, [id]),
      pool.query(`SELECT * FROM onboarding_hardware WHERE onboarding_id=$1 ORDER BY hardware_id`, [id]),
      pool.query(`
        SELECT s.*,
               COALESCE((
                 SELECT json_agg(json_build_object('type', r.type, 'detail', r.detail) ORDER BY r.requirement_id)
                 FROM onboarding_software_requirements r WHERE r.software_id = s.software_id
               ), '[]'::json) AS requirements,
               COALESCE((
                 SELECT json_agg(json_build_object('name', a.name) ORDER BY a.app_id)
                 FROM onboarding_software_apps a WHERE a.software_id = s.software_id
               ), '[]'::json) AS apps
          FROM onboarding_software s
         WHERE s.onboarding_id = $1
         ORDER BY s.software_id
      `, [id]),
      pool.query(`SELECT * FROM onboarding_mail      WHERE onboarding_id=$1 LIMIT 1`, [id]),
      pool.query(`SELECT * FROM onboarding_backup    WHERE onboarding_id=$1 LIMIT 1`, [id]),
      pool.query(`SELECT * FROM onboarding_sonstiges WHERE onboarding_id=$1 LIMIT 1`, [id]),
    ]);

    const payload = {
      ...ob,
      network: netz.rows[0] || null,
      hardware: hw.rows || [],
      software: sw.rows || [],
      mail: mail.rows[0] || null,
      backup: backup.rows[0] || null,
      sonstiges: sonst.rows[0] || null,
    };

    // Kompatibilität: zusätzlich "netzwerk" zurückgeben
    res.json({ ...payload, netzwerk: payload.network });
  } catch (e) {
    console.error('GET /onboarding/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// Voll-Update eines Onboardings (Status + network/hardware/software/mail/backup/sonstiges)
app.patch('/api/onboarding/:id(\\d+)', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const status = body.status;

    // eingehende Kompatibilität (netzwerk vs. network)
    const network = body.network || body.netzwerk || null;
    const hardware = Array.isArray(body.hardware) ? body.hardware : [];
    const software = Array.isArray(body.software) ? body.software : [];
    const mail = body.mail || null;
    const backup = body.backup || null;
    const sonstiges = body.sonstiges || null;

    await client.query('BEGIN');

    // Status (optional)
    if (status) {
      await client.query(`UPDATE onboarding SET status=$1, updated_at=NOW() WHERE onboarding_id=$2`, [status, id]);
    }

    // --- Network: delete+insert (max 1 Row)
    await client.query(`DELETE FROM onboarding_network WHERE onboarding_id=$1`, [id]);
    if (network && Object.keys(network).length) {
      await client.query(
        `INSERT INTO onboarding_network
         (onboarding_id, internetzugangsart, firewall_modell, feste_ip_vorhanden, ip_adresse, vpn_einwahl_erforderlich, aktuelle_vpn_user, geplante_vpn_user, informationen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [ id,
          network.internetzugangsart || null,
          network.firewall_modell || null,
          !!network.feste_ip_vorhanden,
          network.ip_adresse || null,
          !!network.vpn_einwahl_erforderlich,
          Number(network.aktuelle_vpn_user)||0,
          Number(network.geplante_vpn_user)||0,
          network.informationen || null
        ]
      );
    }

    // --- Hardware: delete all + insert
    await client.query(`DELETE FROM onboarding_hardware WHERE onboarding_id=$1`, [id]);
    for (const h of hardware) {
      await client.query(
        `INSERT INTO onboarding_hardware (onboarding_id, typ, hersteller, modell, seriennummer, standort, ip, informationen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [ id, h.typ||null, h.hersteller||null, h.modell||null, h.seriennummer||null, h.standort||null, h.ip||null, h.informationen||null ]
      );
    }

    // --- Software (+ apps + requirements): delete all + insert
    const swIds = await client.query(`SELECT software_id FROM onboarding_software WHERE onboarding_id=$1`, [id]);
    const ids = swIds.rows.map(r => r.software_id);
    if (ids.length) {
      await client.query(`DELETE FROM onboarding_software_apps WHERE software_id = ANY($1)`, [ids]);
      await client.query(`DELETE FROM onboarding_software_requirements WHERE software_id = ANY($1)`, [ids]);
    }
    await client.query(`DELETE FROM onboarding_software WHERE onboarding_id=$1`, [id]);

    for (const s of software) {
      const { rows: ins } = await client.query(
        `INSERT INTO onboarding_software
         (onboarding_id, name, licenses, critical, description, virenschutz, schnittstellen, wartungsvertrag, migration_support)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING software_id`,
        [ id, s.name||null, s.licenses||null, s.critical||null, s.description||null, s.virenschutz||null, s.schnittstellen||null, !!s.wartungsvertrag, !!s.migration_support ]
      );
      const swId = ins.rows[0].software_id;

      if (Array.isArray(s.apps)) {
        for (const a of s.apps) {
          await client.query(`INSERT INTO onboarding_software_apps (software_id, name) VALUES ($1,$2)`, [swId, a?.name || null]);
        }
      }
      if (Array.isArray(s.requirements)) {
        for (const r of s.requirements) {
          await client.query(
            `INSERT INTO onboarding_software_requirements (software_id, type, detail) VALUES ($1,$2,$3)`,
            [swId, r?.type || null, r?.detail || null]
          );
        }
      }
    }

    // --- Mail: delete+insert (max 1 Row)
    await client.query(`DELETE FROM onboarding_mail WHERE onboarding_id=$1`, [id]);
    if (mail && Object.keys(mail).length) {
      await client.query(
        `INSERT INTO onboarding_mail (onboarding_id, anbieter, anzahl_postfach, anzahl_shared, gesamt_speicher, pop3_connector, mobiler_zugriff, informationen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [ id, mail.anbieter||null, Number(mail.anzahl_postfach)||0, Number(mail.anzahl_shared)||0, Number(mail.gesamt_speicher)||0, !!mail.pop3_connector, !!mail.mobiler_zugriff, mail.informationen||null ]
      );
    }

    // --- Backup: delete+insert (max 1 Row)
    await client.query(`DELETE FROM onboarding_backup WHERE onboarding_id=$1`, [id]);
    if (backup && Object.keys(backup).length) {
      await client.query(
        `INSERT INTO onboarding_backup (onboarding_id, tool, interval, retention, location, size, info)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [ id, backup.tool||null, backup.interval||null, backup.retention||null, backup.location||null, Number(backup.size)||0, backup.info||null ]
      );
    }

    // --- Sonstiges: delete+insert (max 1 Row)
    await client.query(`DELETE FROM onboarding_sonstiges WHERE onboarding_id=$1`, [id]);
    if (sonstiges && (sonstiges.text ?? '') !== '') {
      await client.query(`INSERT INTO onboarding_sonstiges (onboarding_id, text) VALUES ($1,$2)`, [id, sonstiges.text]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Onboarding aktualisiert', onboarding_id: id });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('PATCH /api/onboarding/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Onboardings' });
  } finally {
    client.release();
  }
});

app.patch('/api/onboarding/:id(\\d+)/status', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    await pool.query(`UPDATE onboarding SET status=$1, updated_at=NOW() WHERE onboarding_id=$2`, [status || 'neu', id]);
    res.json({ message: 'Status aktualisiert' });
  } catch (e) {
    console.error('PATCH /onboarding/:id/status error:', e);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// --- Vollständige Projekt-PDF ---
async function loadProjectFull(pool, onboardingId) {
  const { rows: hdr } = await pool.query(
    `SELECT 
       o.onboarding_id, o.kunde_id, o.status, o.created_at, o.updated_at, o.datum,
       c.firmenname, c.email AS kunden_email, c.telefonnummer, c.strasse, c.hausnummer, c.plz, c.ort
     FROM onboarding o
     JOIN customers c ON c.kunden_id = o.kunde_id
     WHERE o.onboarding_id = $1`,
    [onboardingId]
  );
  const header = hdr[0];
  if (!header) return null;

  const [netz, hw, sw, mail, backup, sonst] = await Promise.all([
    pool.query(`SELECT * FROM onboarding_network  WHERE onboarding_id=$1 LIMIT 1`, [onboardingId]),
    pool.query(`SELECT * FROM onboarding_hardware WHERE onboarding_id=$1 ORDER BY hardware_id`, [onboardingId]),
    pool.query(`
      SELECT s.*,
             COALESCE((
               SELECT json_agg(json_build_object('type', r.type, 'detail', r.detail) ORDER BY r.requirement_id)
               FROM onboarding_software_requirements r WHERE r.software_id = s.software_id
             ), '[]'::json) AS requirements,
             COALESCE((
               SELECT json_agg(json_build_object('name', a.name) ORDER BY a.app_id)
               FROM onboarding_software_apps a WHERE a.software_id = s.software_id
             ), '[]'::json) AS apps
        FROM onboarding_software s
       WHERE s.onboarding_id = $1
       ORDER BY s.software_id
    `, [onboardingId]),
    pool.query(`SELECT * FROM onboarding_mail      WHERE onboarding_id=$1 LIMIT 1`, [onboardingId]),
    pool.query(`SELECT * FROM onboarding_backup    WHERE onboarding_id=$1 LIMIT 1`, [onboardingId]),
    pool.query(`SELECT * FROM onboarding_sonstiges WHERE onboarding_id=$1 LIMIT 1`, [onboardingId]),
  ]);

  return {
    header,
    network: netz.rows[0] || null,
    hardware: hw.rows || [],
    software: sw.rows || [],
    mail: mail.rows[0] || null,
    backup: backup.rows[0] || null,
    sonstiges: sonst.rows[0] || null,
  };
}

async function createFullProjectPdfBuffer(full) {
  if (!PDFDocument) throw new Error('PDFKit ist nicht installiert (npm i pdfkit).');
  const { header, network, hardware, software, mail, backup, sonstiges } = full;

  return await new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const chunks = [];
      doc.on('data', (d) => chunks.push(d));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const H1 = (t) => { doc.moveDown(0.4).font('Helvetica-Bold').fontSize(16).text(t); doc.moveDown(0.2).font('Helvetica').fontSize(10); };
      const H2 = (t) => { doc.moveDown(0.3).font('Helvetica-Bold').fontSize(13).text(t); doc.moveDown(0.15).font('Helvetica').fontSize(10); };
      const KV = (rows = []) => rows.forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) doc.text(`${k}: ${v}`); });
      const LINE = () => { doc.moveDown(0.15); doc.strokeColor('#ddd').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke(); doc.moveDown(0.15); };

      doc.font('Helvetica-Bold').fontSize(18).text('Projekt-Zusammenfassung');
      doc.font('Helvetica').fontSize(10).moveDown(0.2)
        .text(`Onboarding-ID: ${header.onboarding_id}    •    Status: ${esc(header.status) || 'neu'}    •    Erstellt: ${header.created_at ? new Date(header.created_at).toLocaleString('de-DE') : '–'}`);

      H1('Kundendaten');
      KV([
        ['Firma', esc(header.firmenname)],
        ['Adresse', [esc(header.strasse), esc(header.hausnummer)].filter(Boolean).join(' ')],
        ['PLZ/Ort', [esc(header.plz), esc(header.ort)].filter(Boolean).join(' ')],
        ['Telefon', esc(header.telefonnummer)],
        ['E-Mail', esc(header.kunden_email)],
      ]);
      LINE();

      H1('Netzwerk');
      if (!network) doc.text('Keine Netzwerk-Daten hinterlegt.');
      else KV([
        ['Internetzugang', esc(network.internetzugangsart)],
        ['Firewall', esc(network.firewall_modell)],
        ['Feste IP', network.feste_ip_vorhanden ? 'Ja' : 'Nein'],
        ['IP-Adresse', esc(network.ip_adresse)],
        ['VPN erforderlich', network.vpn_einwahl_erforderlich ? 'Ja' : 'Nein'],
        ['Aktuelle VPN-Nutzer', esc(network.aktuelle_vpn_user)],
        ['Geplante VPN-Nutzer', esc(network.geplante_vpn_user)],
        ['Info', esc(network.informationen)],
      ]);
      LINE();

      H1('Hardware');
      if (!hardware?.length) doc.text('Keine Hardware hinterlegt.');
      else hardware.forEach((h, i) => {
        if (i) doc.moveDown(0.25);
        H2(h.typ || 'Hardware');
        KV([
          ['Hersteller', esc(h.hersteller)],
          ['Modell', esc(h.modell)],
          ['Seriennummer', esc(h.seriennummer)],
          ['Standort', esc(h.standort)],
          ['IP', esc(h.ip)],
          ['Info', esc(h.informationen)],
        ]);
      });
      LINE();

      H1('Software');
      if (!software?.length) doc.text('Keine Software hinterlegt.');
      else software.forEach((s, i) => {
        if (i) doc.moveDown(0.25);
        H2(s.name || 'Software');
        KV([
          ['Lizenzen', esc(s.licenses)],
          ['Kritikalität', esc(s.critical)],
          ['Beschreibung', esc(s.description)],
          ['Virenschutz', esc(s.virenschutz)],
          ['Schnittstellen', esc(s.schnittstellen)],
          ['Wartungsvertrag', esc(s.wartungsvertrag)],
          ['Migration Support', esc(s.migration_support)],
        ]);
        const apps = Array.isArray(s.apps) ? s.apps.map(a => a?.name).filter(Boolean) : [];
        const reqs = Array.isArray(s.requirements) ? s.requirements.map(r => `${esc(r.type)}: ${esc(r.detail)}`) : [];
        if (apps.length) doc.text(`Apps: ${apps.join(', ')}`);
        if (reqs.length) doc.text(`Requirements: ${reqs.join(', ')}`);
      });
      LINE();

      H1('Mail');
      if (!mail) doc.text('Keine Mail-Informationen hinterlegt.');
      else KV([
        ['Anbieter', esc(mail.anbieter)],
        ['# Postfächer', esc(mail.anzahl_postfach)],
        ['# Shared', esc(mail.anzahl_shared)],
        ['Gesamt-Speicher (GB)', esc(mail.gesamt_speicher)],
        ['POP3-Connector', mail.pop3_connector ? 'Ja' : 'Nein'],
        ['Mobiler Zugriff', mail.mobiler_zugriff ? 'Ja' : 'Nein'],
        ['Info', esc(mail.informationen)],
      ]);
      LINE();

      H1('Backup');
      if (!backup) doc.text('Keine Backup-Informationen hinterlegt.');
      else KV([
        ['Tool', esc(backup.tool)],
        ['Intervall', esc(backup.interval)],
        ['Aufbewahrung', esc(backup.retention)],
        ['Ort', esc(backup.location)],
        ['Größe (GB)', esc(backup.size)],
        ['Info', esc(backup.info)],
      ]);
      LINE();

      H1('Sonstiges');
      if (sonstiges?.text) doc.text(esc(sonstiges.text), { width: 523 });
      else doc.text('Keine sonstigen Hinweise.');
      doc.end();
    } catch (e) { reject(e); }
  });
}

// Projekt-Mailversand mit Voll-PDF
app.post('/api/onboarding/:id(\\d+)/send-email', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { to, cc, subject } = req.body || {};

    const full = await loadProjectFull(pool, id);
    if (!full) return res.status(404).json({ error: 'Onboarding nicht gefunden' });

    const recipient = (to || full.header.kunden_email || '').trim();
    if (!recipient) return res.status(400).json({ error: 'Keine Empfängeradresse vorhanden' });

    const subj = subject || `Projekt-Zusammenfassung – ${full.header.firmenname} (Onboarding #${id})`;
    if (!PDFDocument) throw new Error('PDFKit nicht installiert – bitte "npm i pdfkit" ausführen.');
    const pdf = await createFullProjectPdfBuffer(full);

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
        <p>Guten Tag,</p>
        <p>im Anhang finden Sie die vollständige Projekt-Zusammenfassung (inkl. Infrastruktur) als PDF.</p>
        <p><b>Kunde:</b> ${esc(full.header.firmenname)}<br/>
           <b>Onboarding-ID:</b> ${id}<br/>
           <b>Status:</b> ${esc(full.header.status || 'neu')}</p>
        <p>Beste Grüße<br/>Ihr IT-Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: SMTP_FROM,
      to: recipient,
      cc: Array.isArray(cc) ? cc : (cc ? [cc] : undefined),
      subject: subj,
      html,
      attachments: [{ filename: `Projekt_${id}.pdf`, content: pdf }],
    });

    res.json({ success: true, sent_to: recipient, withPdf: true });
  } catch (e) {
    console.error('send-email project error:', e);
    res.status(500).json({ error: e.message || 'Fehler beim Versenden' });
  }
});

// ============================================================
// =                    KALKULATIONEN                         =
// ============================================================

async function getCalcWithTotalsById(id) {
  const { rows } = await pool.query(
    `
    SELECT k.kalkulations_id, k.kunden_id, k.datum, k.stundensatz, k.mwst_prozent,
           k.gesamtzeit, k.gesamtpreis, k.status, k.created_at, k.updated_at,
           c.firmenname,
           v.sum_netto::numeric(12,2)  AS sum_netto,
           v.sum_mwst::numeric(12,2)   AS sum_mwst,
           v.sum_brutto::numeric(12,2) AS sum_brutto
    FROM kalkulationen k
    JOIN customers c ON c.kunden_id = k.kunden_id
    JOIN v_kalkulationen_berechnet v ON v.kalkulations_id = k.kalkulations_id
    WHERE k.kalkulations_id = $1
    `,
    [id]
  );
  return rows[0] || null;
}

app.get('/api/kalkulationen/stats', verifyToken, async (_req, res) => {
  try {
    const [kundenQ, projekteQ, stundenQ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS cnt FROM customers`),
      pool.query(`SELECT COUNT(*)::int AS cnt FROM onboarding`),
      pool.query(`SELECT COALESCE(SUM(gesamtzeit),0)::float8 AS total_hours FROM kalkulationen`)
    ]);
    res.json({
      activeCustomers: Number(kundenQ.rows[0].cnt || 0),
      runningProjects: Number(projekteQ.rows[0].cnt || 0),
      totalHours: Number(stundenQ.rows[0].total_hours || 0),
    });
  } catch (e) {
    console.error('GET /kalkulationen/stats error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

app.get('/api/kalkulationen', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { rows } = await pool.query(
      `
      SELECT k.kalkulations_id, k.kunden_id, c.firmenname,
             k.datum, k.status,
             v.sum_netto::numeric(12,2)  AS sum_netto,
             v.sum_mwst::numeric(12,2)   AS sum_mwst,
             v.sum_brutto::numeric(12,2) AS sum_brutto,
             k.gesamtzeit, k.gesamtpreis
      FROM kalkulationen k
      JOIN customers c ON c.kunden_id = k.kunden_id
      JOIN v_kalkulationen_berechnet v ON v.kalkulations_id = k.kalkulations_id
      ORDER BY k.datum DESC, k.kalkulations_id DESC
      LIMIT $1
      `,
      [limit]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /kalkulationen error:', e);
    res.status(500).json({ error: 'Fehler beim Laden der Kalkulationen' });
  }
});

app.get('/api/kalkulationen/:id(\\d+)', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const header = await getCalcWithTotalsById(id);
    if (!header) return res.status(404).json({ error: 'Kalkulation nicht gefunden' });

    const { rows: pos } = await pool.query(
      `
      SELECT position_id, kalkulations_id, section, beschreibung,
             anzahl, dauer_pro_einheit, stundensatz, info,
             created_at, updated_at
      FROM kalkulation_positionen
      WHERE kalkulations_id = $1
      ORDER BY position_id ASC
      `,
      [id]
    );

    res.json({ header, positionen: pos });
  } catch (e) {
    console.error('GET /kalkulationen/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Laden der Kalkulation' });
  }
});

app.post('/api/kalkulationen', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const kundenId = Number(body.kunden_id ?? body.kunde_id);
    if (!kundenId) return res.status(400).json({ error: 'kunde_id ist erforderlich' });

    const stdsatz = body.stundensatz == null ? null : (Number(body.stundensatz) || 0);
    const mwst = body.mwst == null ? 19 : (Number(body.mwst) || 0);
    const items = Array.isArray(body.dienstleistungen) ? body.dienstleistungen : [];
    if (items.length === 0) return res.status(400).json({ error: 'dienstleistungen darf nicht leer sein' });

    await client.query('BEGIN');
    const { rows: hdrRows } = await client.query(
      `INSERT INTO kalkulationen (kunden_id, stundensatz, mwst_prozent, status)
       VALUES ($1,$2,$3,'neu') RETURNING kalkulations_id`,
      [kundenId, stdsatz, mwst]
    );
    const kalkId = hdrRows[0].kalkulations_id;

    for (const r of items) {
      await client.query(
        `INSERT INTO kalkulation_positionen
           (kalkulations_id, section, beschreibung, anzahl, dauer_pro_einheit, stundensatz, info)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          kalkId,
          r.section || null,
          String(r.beschreibung || '').trim(),
          Number(r.anzahl) || 0,
          Number(r.dauer_pro_einheit) || 0,
          r.stundensatz == null ? null : (Number(r.stundensatz) || 0),
          (r.info ?? null),
        ]
      );
    }

    const header = await getCalcWithTotalsById(kalkId);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Kalkulation angelegt', kalkulations_id: kalkId, header });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('POST /kalkulationen error:', e);
    res.status(500).json({ error: 'Fehler beim Anlegen der Kalkulation' });
  } finally {
    client.release();
  }
});

app.patch('/api/kalkulationen/:id(\\d+)', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    await client.query('BEGIN');

    if (body.stundensatz != null || body.mwst != null || body.status != null) {
      await client.query(
        `UPDATE kalkulationen
           SET stundensatz = COALESCE($1, stundensatz),
               mwst_prozent = COALESCE($2, mwst_prozent),
               status = COALESCE($3, status),
               updated_at = NOW()
         WHERE kalkulations_id = $4`,
        [
          body.stundensatz == null ? null : (Number(body.stundensatz) || 0),
          body.mwst == null ? null : (Number(body.mwst) || 0),
          body.status || null,
          id
        ]
      );
    }

    if (Array.isArray(body.dienstleistungen)) {
      await client.query(`DELETE FROM kalkulation_positionen WHERE kalkulations_id = $1`, [id]);
      for (const r of body.dienstleistungen) {
        await client.query(
          `INSERT INTO kalkulation_positionen
             (kalkulations_id, section, beschreibung, anzahl, dauer_pro_einheit, stundensatz, info)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            id,
            r.section || null,
            String(r.beschreibung || '').trim(),
            Number(r.anzahl) || 0,
            Number(r.dauer_pro_einheit) || 0,
            r.stundensatz == null ? null : (Number(r.stundensatz) || 0),
            (r.info ?? null),
          ]
        );
      }
    }

    const header = await getCalcWithTotalsById(id);
    await client.query('COMMIT');
    res.json({ message: 'Kalkulation aktualisiert', header });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('PATCH /kalkulationen/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Kalkulation' });
  } finally {
    client.release();
  }
});

app.delete('/api/kalkulationen/:id(\\d+)', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rowCount } = await pool.query(`DELETE FROM kalkulationen WHERE kalkulations_id=$1`, [id]);
    if (!rowCount) return res.status(404).json({ error: 'Kalkulation nicht gefunden' });
    res.json({ message: 'Kalkulation gelöscht' });
  } catch (e) {
    console.error('DELETE /kalkulationen/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Löschen der Kalkulation' });
  }
});

// --- Vollständige Kalkulations-PDF ---
async function loadCalculationFull(pool, kalkulationsId) {
  const { rows: hdr } = await pool.query(
    `
    SELECT k.kalkulations_id, k.kunden_id, k.datum, k.stundensatz, k.mwst_prozent,
           k.gesamtzeit, k.gesamtpreis, k.status, k.created_at, k.updated_at,
           c.firmenname, c.email AS kunden_email, c.strasse, c.hausnummer, c.plz, c.ort,
           v.sum_netto::numeric(12,2)  AS sum_netto,
           v.sum_mwst::numeric(12,2)   AS sum_mwst,
           v.sum_brutto::numeric(12,2) AS sum_brutto
    FROM kalkulationen k
    JOIN customers c ON c.kunden_id = k.kunden_id
    JOIN v_kalkulationen_berechnet v ON v.kalkulations_id = k.kalkulations_id
    WHERE k.kalkulations_id = $1
    `,
    [kalkulationsId]
  );
  const header = hdr[0];
  if (!header) return null;

  const { rows: pos } = await pool.query(
    `
    SELECT position_id, section, beschreibung, anzahl, dauer_pro_einheit, stundensatz, info
    FROM kalkulation_positionen
    WHERE kalkulations_id=$1
    ORDER BY position_id ASC
    `,
    [kalkulationsId]
  );

  return { header, positionen: pos };
}

async function createFullCalculationPdfBuffer(calc) {
  if (!PDFDocument) throw new Error('PDFKit ist nicht installiert (npm i pdfkit).');
  const { header, positionen } = calc;

  return await new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const chunks = [];
      doc.on('data', (d) => chunks.push(d));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const H1 = (t) => { doc.moveDown(0.4).font('Helvetica-Bold').fontSize(16).text(t); doc.moveDown(0.2).font('Helvetica').fontSize(10); };
      const H2 = (t) => { doc.moveDown(0.3).font('Helvetica-Bold').fontSize(13).text(t); doc.moveDown(0.15).font('Helvetica').fontSize(10); };
      const KV = (rows = []) => rows.forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) doc.text(`${k}: ${v}`); });
      const LINE = () => { doc.moveDown(0.15); doc.strokeColor('#ddd').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke(); doc.moveDown(0.15); };

      // Titel + Kunde
      doc.font('Helvetica-Bold').fontSize(18).text('Stundenkalkulation');
      doc.font('Helvetica').fontSize(10).moveDown(0.2)
        .text(`Kalkulations-ID: ${header.kalkulations_id}    •    Datum: ${header.datum ? new Date(header.datum).toLocaleDateString('de-DE') : '–'}    •    Status: ${esc(header.status) || 'neu'}`);
      H1('Kundendaten');
      KV([
        ['Firma', esc(header.firmenname)],
        ['Adresse', [esc(header.strasse), esc(header.hausnummer)].filter(Boolean).join(' ')],
        ['PLZ/Ort', [esc(header.plz), esc(header.ort)].filter(Boolean).join(' ')],
        ['E-Mail', esc(header.kunden_email)],
      ]);
      LINE();

      // Kopf
      H1('Kalkulationsdaten');
      KV([
        ['Standard-Stundensatz', fmt(header.stundensatz) ? `${fmt(header.stundensatz)} €` : '—'],
        ['MwSt.-Satz', header.mwst_prozent != null ? `${Number(header.mwst_prozent)} %` : '—'],
        ['Gesamtzeit (h)', header.gesamtzeit != null ? String(header.gesamtzeit) : '—'],
        ['Gesamtpreis', fmt(header.gesamtpreis) ? `${fmt(header.gesamtpreis)} €` : '—'],
      ]);
      LINE();

      // Positionen
      H1('Positionen');
      if (!positionen?.length) {
        doc.text('Keine Positionen vorhanden.');
      } else {
        let currentSection = null;
        positionen.forEach((p, i) => {
          if (p.section && p.section !== currentSection) {
            if (i) doc.moveDown(0.2);
            H2(p.section);
            currentSection = p.section;
          }
          const stdsatz = (p.stundensatz != null) ? Number(p.stundensatz) : (header.stundensatz != null ? Number(header.stundensatz) : 0);
          const zeit = (Number(p.anzahl) || 0) * (Number(p.dauer_pro_einheit) || 0);
          const betrag = zeit * stdsatz;

          doc.text(`• ${esc(p.beschreibung) || 'Position'}`);
          KV([
            ['Anzahl', p.anzahl != null ? String(p.anzahl) : '—'],
            ['Dauer/Einheit (h)', p.dauer_pro_einheit != null ? String(p.dauer_pro_einheit) : '—'],
            ['Zeit gesamt (h)', zeit ? String(zeit) : '—'],
            ['Stundensatz', stdsatz ? `${fmt(stdsatz)} €` : '—'],
            ['Positionswert', betrag ? `${fmt(betrag)} €` : '—'],
            ['Info', esc(p.info)],
          ]);
          doc.moveDown(0.1);
        });
      }
      LINE();

      // Summen
      H1('Summen');
      KV([
        ['Netto', header.sum_netto != null ? `${fmt(header.sum_netto)} €` : '—'],
        ['MwSt.', header.sum_mwst != null ? `${fmt(header.sum_mwst)} €` : '—'],
        ['Brutto', header.sum_brutto != null ? `${fmt(header.sum_brutto)} €` : '—'],
      ]);

      doc.end();
    } catch (e) { reject(e); }
  });
}

// Kalkulation-Mailversand mit Voll-PDF
app.post('/api/kalkulationen/:id(\\d+)/send-email', verifyToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { to, cc, subject } = req.body || {};

    const full = await loadCalculationFull(pool, id);
    if (!full) return res.status(404).json({ error: 'Kalkulation nicht gefunden' });

    const recipient = (to || full.header.kunden_email || '').trim();
    if (!recipient) return res.status(400).json({ error: 'Keine Empfängeradresse vorhanden' });

    const subj = subject || `Stundenkalkulation – ${full.header.firmenname} (ID ${id})`;
    if (!PDFDocument) throw new Error('PDFKit nicht installiert – bitte "npm i pdfkit" ausführen.');
    const pdf = await createFullCalculationPdfBuffer(full);

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
        <p>Guten Tag,</p>
        <p>im Anhang finden Sie die <b>vollständige Stundenkalkulation</b> als PDF.</p>
        <p><b>Kunde:</b> ${esc(full.header.firmenname)}<br/>
           <b>Kalkulations-ID:</b> ${id}<br/>
           <b>Status:</b> ${esc(full.header.status || 'neu')}</p>
        <p>Beste Grüße<br/>Ihr IT-Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: SMTP_FROM,
      to: recipient,
      cc: Array.isArray(cc) ? cc : (cc ? [cc] : undefined),
      subject: subj,
      html,
      attachments: [{ filename: `Kalkulation_${id}.pdf`, content: pdf }],
    });

    res.json({ success: true, sent_to: recipient, withPdf: true });
  } catch (e) {
    console.error('send-email calc error:', e);
    res.status(500).json({ error: e.message || 'Fehler beim Versenden' });
  }
});

// ============================================================
// =                      FALLBACKS                           =
// ============================================================

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});

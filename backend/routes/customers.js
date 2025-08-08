
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

// PostgreSQL Connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'pauly2026!',
  port: process.env.DB_PORT || 5432,
});

// GET /api/customers - Alle Kunden abrufen
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        k.*,
        COUNT(a.ansprechpartner_id) as ansprechpartner_count,
        COUNT(o.onboarding_id) as onboarding_count
      FROM kunde k
      LEFT JOIN ansprechpartner a ON k.kunden_id = a.kunde_id
      LEFT JOIN onboarding o ON k.kunden_id = o.kunde_id
      GROUP BY k.kunden_id
      ORDER BY k.kunden_id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kunden' });
  }
});

// POST /api/customers - Neuen Kunden erstellen
router.post('/', async (req, res) => {
  try {
    const { firmenname, strasse, hausnummer, ort, plz, telefonnummer, email, ansprechpartner } = req.body;

    // Validierung
    if (!firmenname || !strasse || !hausnummer || !ort || !plz || !telefonnummer || !email) {
      return res.status(400).json({
        error: 'Alle Pflichtfelder müssen ausgefüllt werden'
      });
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Ungültiges E-Mail-Format'
      });
    }

    // Prüfen ob Kunde bereits existiert
    const existingCustomer = await pool.query(
      'SELECT kunden_id FROM kunde WHERE email = $1 OR firmenname = $2',
      [email, firmenname]
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({
        error: 'Kunde mit dieser E-Mail oder Firma existiert bereits'
      });
    }

    // Transaction starten für Kunde + Ansprechpartner
    await pool.query('BEGIN');

    try {
      // Neuen Kunden erstellen
      const kundeResult = await pool.query(`
        INSERT INTO kunde (firmenname, strasse, hausnummer, ort, plz, telefonnummer, email) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *
      `, [firmenname, strasse, hausnummer, ort, plz, telefonnummer, email]);

      const neuerKunde = kundeResult.rows[0];

      // Ansprechpartner erstellen (falls angegeben)
      if (ansprechpartner && ansprechpartner.name && ansprechpartner.vorname) {
        await pool.query(`
          INSERT INTO ansprechpartner (name, vorname, telefonnummer, email, position, kunde_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          ansprechpartner.name,
          ansprechpartner.vorname,
          ansprechpartner.telefonnummer || telefonnummer,
          ansprechpartner.email || email,
          ansprechpartner.position || 'Hauptansprechpartner',
          neuerKunde.kunden_id
        ]);
      }

      await pool.query('COMMIT');

      res.status(201).json({
        message: 'Kunde erfolgreich erstellt',
        kunde: neuerKunde
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Kunden' });
  }
});

// GET /api/customers/:id - Einzelnen Kunden mit Ansprechpartnern abrufen
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kunde abrufen
    const kundeResult = await pool.query(
      'SELECT * FROM kunde WHERE kunden_id = $1',
      [id]
    );

    if (kundeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    // Ansprechpartner abrufen
    const ansprechpartnerResult = await pool.query(
      'SELECT * FROM ansprechpartner WHERE kunde_id = $1',
      [id]
    );

    const kunde = kundeResult.rows[0];
    kunde.ansprechpartner = ansprechpartnerResult.rows;

    res.json(kunde);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Kunden' });
  }
});

// GET /api/customers/:id/onboardings - Onboardings eines Kunden
router.get('/:id/onboardings', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        o.*,
        m.name as mitarbeiter_name,
        m.vorname as mitarbeiter_vorname
      FROM onboarding o
      LEFT JOIN mitarbeiter m ON o.mitarbeiter_id = m.mitarbeiter_id
      WHERE o.kunde_id = $1
      ORDER BY o.datum DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer onboardings:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Onboardings' });
  }
});

// GET /api/customers/:id/kalkulationen - Kalkulationen eines Kunden
router.get('/:id/kalkulationen', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        k.*,
        m.name as mitarbeiter_name,
        m.vorname as mitarbeiter_vorname
      FROM kalkulation k
      LEFT JOIN mitarbeiter m ON k.mitarbeiter_id = m.mitarbeiter_id
      WHERE k.kunde_id = $1
      ORDER BY k.datum DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer calculations:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kalkulationen' });
  }
});

// PUT /api/customers/:id - Kunden aktualisieren
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firmenname, strasse, hausnummer, ort, plz, telefonnummer, email } = req.body;

    const result = await pool.query(`
      UPDATE kunde 
      SET firmenname = $1, strasse = $2, hausnummer = $3, ort = $4, plz = $5, telefonnummer = $6, email = $7
      WHERE kunden_id = $8 
      RETURNING *
    `, [firmenname, strasse, hausnummer, ort, plz, telefonnummer, email, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    res.json({
      message: 'Kunde erfolgreich aktualisiert',
      kunde: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Kunden' });
  }
});

module.exports = router;
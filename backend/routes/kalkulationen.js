// backend/routes/kalkulationen.js - Angepasst an deine Tabellen-Struktur
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// PostgreSQL Connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pauly_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// GET /api/kalkulationen - Alle Kalkulationen abrufen
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        k.*, 
        ku.firmenname as kunde_name,
        m.name as mitarbeiter_name,
        m.vorname as mitarbeiter_vorname,
        COUNT(d.dienstleistungs_id) as dienstleistungen_count
      FROM kalkulation k
      JOIN kunde ku ON k.kunde_id = ku.kunden_id
      LEFT JOIN mitarbeiter m ON k.mitarbeiter_id = m.mitarbeiter_id
      LEFT JOIN dienstleistung d ON k.kalkulations_id = d.kalkulation_id
      GROUP BY k.kalkulations_id, ku.firmenname, m.name, m.vorname
      ORDER BY k.datum DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching kalkulationen:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kalkulationen' });
  }
});

// POST /api/kalkulationen - Neue Kalkulation erstellen
router.post('/', async (req, res) => {
  try {
    const { kunde_id, stundensatz, dienstleistungen, mitarbeiter_id } = req.body;

    // Validierung
    if (!kunde_id || !stundensatz || !dienstleistungen || !Array.isArray(dienstleistungen)) {
      return res.status(400).json({
        error: 'Kunde, Stundensatz und Dienstleistungen sind erforderlich'
      });
    }

    // Prüfen ob Kunde existiert
    const kundeExists = await pool.query(
      'SELECT kunden_id FROM kunde WHERE kunden_id = $1',
      [kunde_id]
    );

    if (kundeExists.rows.length === 0) {
      return res.status(400).json({
        error: 'Der angegebene Kunde existiert nicht'
      });
    }

    // Gesamtzeit und Gesamtpreis berechnen
    let gesamtzeit = 0;
    for (const dienst of dienstleistungen) {
      const dauer = parseFloat(dienst.dauer_pro_einheit) || 0;
      const anzahl = parseInt(dienst.anzahl) || 1;
      gesamtzeit += dauer * anzahl;
    }

    const gesamtpreis = gesamtzeit * parseFloat(stundensatz);

    // Transaction starten
    await pool.query('BEGIN');

    try {
      // Neue Kalkulation erstellen
      const kalkulationResult = await pool.query(`
        INSERT INTO kalkulation (datum, gesamtpreis, gesamtzeit, stundensatz, status, kunde_id, mitarbeiter_id) 
        VALUES (CURRENT_DATE, $1, $2, $3, 'neu', $4, $5) 
        RETURNING *
      `, [gesamtpreis, gesamtzeit, stundensatz, kunde_id, mitarbeiter_id || 1]);

      const neueKalkulation = kalkulationResult.rows[0];

      // Dienstleistungen hinzufügen
      for (const dienst of dienstleistungen) {
        const dauer = parseFloat(dienst.dauer_pro_einheit) || 0;
        const anzahl = parseInt(dienst.anzahl) || 1;
        const gesamtdauer = dauer * anzahl;

        await pool.query(`
          INSERT INTO dienstleistung (beschreibung, dauer_pro_einheit, anzahl, gesamtdauer, info, kalkulation_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          dienst.beschreibung,
          dauer,
          anzahl,
          gesamtdauer,
          dienst.info || null,
          neueKalkulation.kalkulations_id
        ]);
      }

      await pool.query('COMMIT');

      // Kalkulation mit Details abrufen
      const vollstaendigeKalkulation = await pool.query(`
        SELECT 
          k.*, 
          ku.firmenname as kunde_name,
          m.name as mitarbeiter_name,
          m.vorname as mitarbeiter_vorname
        FROM kalkulation k
        JOIN kunde ku ON k.kunde_id = ku.kunden_id
        LEFT JOIN mitarbeiter m ON k.mitarbeiter_id = m.mitarbeiter_id
        WHERE k.kalkulations_id = $1
      `, [neueKalkulation.kalkulations_id]);

      res.status(201).json({
        message: 'Kalkulation erfolgreich erstellt',
        kalkulation: vollstaendigeKalkulation.rows[0]
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error creating kalkulation:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Kalkulation' });
  }
});

// GET /api/kalkulationen/:id - Einzelne Kalkulation mit Dienstleistungen
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kalkulation abrufen
    const kalkulationResult = await pool.query(`
      SELECT 
        k.*, 
        ku.firmenname as kunde_name,
        ku.email as kunde_email,
        m.name as mitarbeiter_name,
        m.vorname as mitarbeiter_vorname
      FROM kalkulation k
      JOIN kunde ku ON k.kunde_id = ku.kunden_id
      LEFT JOIN mitarbeiter m ON k.mitarbeiter_id = m.mitarbeiter_id
      WHERE k.kalkulations_id = $1
    `, [id]);

    if (kalkulationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kalkulation nicht gefunden' });
    }

    // Dienstleistungen abrufen
    const dienstleistungenResult = await pool.query(
      'SELECT * FROM dienstleistung WHERE kalkulation_id = $1 ORDER BY dienstleistungs_id',
      [id]
    );

    const kalkulation = kalkulationResult.rows[0];
    kalkulation.dienstleistungen = dienstleistungenResult.rows;

    res.json(kalkulation);
  } catch (error) {
    console.error('Error fetching kalkulation:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kalkulation' });
  }
});

// GET /api/kalkulationen/stats - Dashboard-Statistiken
router.get('/stats', async (req, res) => {
  try {
    const [
      kundenCount,
      aktiveProjekte,
      monatsStunden,
      monatsUmsatz,
      offeneKalkulationen
    ] = await Promise.all([
      // Kunden zählen
      pool.query('SELECT COUNT(*) FROM kunde'),
      
      // Aktive Onboardings zählen
      pool.query("SELECT COUNT(*) FROM onboarding WHERE status IN ('neu', 'in Arbeit')"),
      
      // Stunden diesen Monat
      pool.query(`
        SELECT COALESCE(SUM(gesamtzeit), 0) as total_hours 
        FROM kalkulation 
        WHERE EXTRACT(MONTH FROM datum) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM datum) = EXTRACT(YEAR FROM CURRENT_DATE)
      `),
      
      // Umsatz diesen Monat
      pool.query(`
        SELECT COALESCE(SUM(gesamtpreis), 0) as total_revenue 
        FROM kalkulation 
        WHERE EXTRACT(MONTH FROM datum) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM datum) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND status = 'erledigt'
      `),

      // Offene Kalkulationen
      pool.query("SELECT COUNT(*) FROM kalkulation WHERE status IN ('neu', 'in Arbeit')")
    ]);

    const stats = {
      activeCustomers: parseInt(kundenCount.rows[0].count),
      runningProjects: parseInt(aktiveProjekte.rows[0].count),
      monthlyHours: parseFloat(monatsStunden.rows[0].total_hours || 0),
      monthlyRevenue: parseFloat(monatsUmsatz.rows[0].total_revenue || 0),
      openCalculations: parseInt(offeneKalkulationen.rows[0].count)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

// PUT /api/kalkulationen/:id/status - Status einer Kalkulation ändern
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['neu', 'in Arbeit', 'erledigt'].includes(status)) {
      return res.status(400).json({
        error: 'Ungültiger Status. Erlaubt: neu, in Arbeit, erledigt'
      });
    }

    const result = await pool.query(`
      UPDATE kalkulation 
      SET status = $1::kalkulation_status
      WHERE kalkulations_id = $2 
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kalkulation nicht gefunden' });
    }

    res.json({
      message: 'Status erfolgreich aktualisiert',
      kalkulation: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
  }
});

module.exports = router;
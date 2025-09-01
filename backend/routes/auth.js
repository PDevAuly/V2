import express from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { vorname, nachname, email, passwort } = req.body;

  try {
    // Prüfen ob E-Mail bereits existiert
    const existingUser = await pool.query('SELECT id FROM mitarbeiter WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'E-Mail bereits registriert' });
    }

    const hashedPassword = await bcrypt.hash(passwort, 12); // 12 rounds für bessere Sicherheit

    const result = await pool.query(
      'INSERT INTO mitarbeiter (vorname, name, email, passwort, telefonnummer) VALUES ($1, $2, $3, $4, $5) RETURNING id, vorname, name, email',
      [vorname, nachname, email, hashedPassword, '']
    );

    res.status(201).json({ 
      message: 'Registrierung erfolgreich!',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
});

router.post('/login', async (req, res) => {
  const { email, passwort } = req.body;

  try {
    const user = await pool.query('SELECT * FROM mitarbeiter WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const valid = await bcrypt.compare(passwort, user.rows[0].passwort);

    if (!valid) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Session setzen (WICHTIG für change-password)
    req.session.userId = user.rows[0].id;
    req.session.user = {
      id: user.rows[0].id,
      vorname: user.rows[0].vorname,
      name: user.rows[0].name,
      email: user.rows[0].email
    };

    // Passwort nicht zurückgeben
    const { passwort: _, ...userWithoutPassword } = user.rows[0];

    res.status(200).json({ 
      message: 'Login erfolgreich', 
      user: userWithoutPassword 
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Fehler beim Login' });
  }
});

// NEU: Change Password Route
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Input-Validierung
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Aktuelles und neues Passwort sind erforderlich'
      });
    }
    
    // Mindestens 8 Zeichen
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Neues Passwort muss mindestens 8 Zeichen lang sein'
      });
    }
    
    // User-ID aus Session
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Nicht angemeldet - bitte erneut einloggen'
      });
    }
    
    // User aus Datenbank holen
    const userResult = await pool.query(
      'SELECT id, email, passwort FROM mitarbeiter WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Benutzer nicht gefunden'
      });
    }
    
    const user = userResult.rows[0];
    
    // Aktuelles Passwort prüfen
    const isValid = await bcrypt.compare(currentPassword, user.passwort);
    
    if (!isValid) {
      return res.status(401).json({
        error: 'Aktuelles Passwort ist falsch'
      });
    }
    
    // Neues Passwort hashen
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // In Datenbank speichern
    await pool.query(
      'UPDATE mitarbeiter SET passwort = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
    
    console.log(`Password changed for user: ${user.email} at ${new Date().toISOString()}`);
    
    res.json({
      message: 'Passwort erfolgreich geändert'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Serverfehler beim Ändern des Passworts'
    });
  }
});

// NEU: Logout Route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Fehler beim Abmelden' });
    }
    res.json({ message: 'Erfolgreich abgemeldet' });
  });
});

export default router;
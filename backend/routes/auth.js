import express from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { vorname, nachname, email, passwort } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(passwort, 10);

    await pool.query(
      'INSERT INTO mitarbeiter (vorname, name, email, passwort, telefonnummer) VALUES ($1, $2, $3, $4, $5)',
      [vorname, nachname, email, hashedPassword, '']
    );

    res.status(201).json({ message: 'Registrierung erfolgreich!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
});

router.post('/login', async (req, res) => {
  const { email, passwort } = req.body;

  try {
    const user = await pool.query('SELECT * FROM mitarbeiter WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    const valid = await bcrypt.compare(passwort, user.rows[0].passwort);

    if (!valid) {
      return res.status(401).json({ error: 'Falsches Passwort' });
    }

    res.status(200).json({ message: 'Login erfolgreich', user: user.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Fehler beim Login' });
  }
});

export default router;

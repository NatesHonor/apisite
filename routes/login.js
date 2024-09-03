const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../utils/db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length > 0) {
      return res.json({ success: false, message: 'User already exists' });
    } else {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await pool.query('INSERT INTO account_data (email, username, password) VALUES (?, ?, ?)', [email, username, hashedPassword]);
      res.json({ success: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length === 0) {
      return res.json({ success: false, message: 'Invalid credentials' });
    } else {
      const user = results[0];
      const isValidPassword = bcrypt.compareSync(password, user.password);
      if (isValidPassword) {
        res.json({ success: true });
      } else {
        res.json({ success: false, message: 'Invalid credentials' });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/credits/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const [results] = await pool.query('SELECT credits FROM account_data WHERE email = ?', [email]);
    if (results.length === 0) {
      return res.json({ success: false, message: 'User not found' });
    } else {
      const user = results[0];
      res.json({ success: true, credits: user.credits });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

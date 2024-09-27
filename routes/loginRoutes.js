const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../utils/db');

const router = express.Router();

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length === 0) {
      return done(null, false, { message: 'Invalid credentials' });
    }
    const user = results[0];
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return done(null, false, { message: 'Invalid credentials' });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [results] = await pool.query('SELECT * FROM account_data WHERE id = ?', [id]);
    if (results.length === 0) {
      return done(null, false);
    }
    return done(null, results[0]);
  } catch (error) {
    return done(error);
  }
});

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

router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

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

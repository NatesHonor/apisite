const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../utils/db');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const redisClient = createClient({
  url: process.env.REDIS_URL,
  legacyMode: true
});
redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.connect().catch(console.error);

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS
  }
});

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length === 0) return done(null, false, { message: 'Invalid credentials' });
    const user = results[0];
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) return done(null, false, { message: 'Invalid credentials' });
    if (!user.verified || user.verified === 'false') {
      return done(null, false, { message: 'Email needs to be verified' });
    }
    return done(null, user);
  } catch (error) {
    console.error('Error during login:', error);
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  if (user && user.userid) done(null, user.userid);
  else done(new Error('User serialization failed'));
});

passport.deserializeUser(async (id, done) => {
  try {
    const [results] = await pool.query('SELECT * FROM account_data WHERE id = ?', [id]);
    if (results.length === 0) return done(null, false);
    return done(null, results[0]);
  } catch (error) {
    return done(error);
  }
});

router.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      if (info.message === 'Email needs to be verified') {
        return res.status(401).json({
          success: false,
          message: info.message,
          resend: true
        });
      }
      return res.status(401).json({ success: false, message: info.message });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      const token = jwt.sign(
        { id: user.userid, email: user.email, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      res.cookie('auth', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 60 * 1000
      });
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.userid,
          email: user.email,
          username: user.username,
          role: user.role
        }
      });
    });
  })(req, res, next);
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth');
  req.logout(() => {
    res.json({ success: true, message: 'Logged out' });
  });
});

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length > 0) return res.json({ success: false, message: 'User already exists' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    try {
      await transporter.sendMail({
        from: process.env.ZOHO_USER,
        to: email,
        subject: 'Verify your email',
        text: `Click here to verify your account: ${verificationLink}`
      });
    } catch (err) {
      console.error('Email send failed:', err);
      return res.status(500).json({ success: false, message: 'Email failed, registration aborted.' });
    }

    await pool.query('INSERT INTO account_data (email, username, password, verified) VALUES (?, ?, ?, ?)', [email, username, hashedPassword, false]);
    const [newUser] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);

    return res.json({
      success: true,
      message: 'Registration successful. Verification email sent.',
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        username: newUser[0].username,
        role: newUser[0].role
      }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

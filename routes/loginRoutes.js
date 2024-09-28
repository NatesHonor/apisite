const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../utils/db');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
require('dotenv').config();

const customSerializer = {
  stringify: (obj) => JSON.stringify(obj),
  parse: (str) => JSON.parse(str)
};

const redisClient = createClient({
  url: process.env.REDIS_URL,
  legacyMode: true
});
redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.connect().catch(console.error);

const router = express.Router();

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    console.log('Attempting login for:', email);

    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length === 0) {
      console.log('No user found with email:', email);
      return done(null, false, { message: 'Invalid credentials' });
    }

    const user = results[0];
    console.log('User found:', user);

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return done(null, false, { message: 'Invalid credentials' });
    }

    console.log('Login successful for:', email);
    return done(null, user);
  } catch (error) {
    console.error('Error during login:', error);
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user); 
  if (user && user.id) {
    done(null, user.id);
  } else {
    done(new Error('User serialization failed: User ID is undefined'));
  }
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user:', id);
    const [results] = await pool.query('SELECT * FROM account_data WHERE id = ?', [id]);
    if (results.length === 0) {
      console.log('No user found for deserialization:', id);
      return done(null, false);
    }
    console.log('Deserialized user:', results[0]);
    return done(null, results[0]);
  } catch (error) {
    console.error('Error during deserialization:', error);
    return done(error);
  }
});

router.use(session({
  store: new RedisStore({
    client: redisClient,
    serializer: customSerializer
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    console.log('Attempting to register user:', email);
    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length > 0) {
      console.log('User already exists:', email);
      return res.json({ success: false, message: 'User already exists' });
    } else {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await pool.query('INSERT INTO account_data (email, username, password) VALUES (?, ?, ?)', [email, username, hashedPassword]);
      console.log('User registered successfully:', email);
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login', (req, res, next) => {
  console.log('Login route hit:', req.body);
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Authentication error:', err);
      return next(err);
    }
    if (!user) {
      console.log('Authentication failed:', info.message);
      return res.status(401).json({ success: false, message: info.message });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      console.log('Login successful for user:', user);
      return res.json({ success: true, user });
    });
  })(req, res, next);
});

module.exports = router;

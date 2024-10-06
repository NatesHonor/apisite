const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../utils/db');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
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
    console.error('Error during login:', error);
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  if (user && user.userid) {
    done(null, user.userid);
  } else {
    done(new Error('User serialization failed: User ID is undefined'));
  }
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

router.post('/login', (req, res, next) => {
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
      const token = jwt.sign(
        { 
          id: user.userid, 
          email: user.email, 
          username: user.username, 
          role: user.role 
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );
      return res.json({
        success: true,
        message: 'Login successful',
        token,
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

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length > 0) {
      return res.json({ success: false, message: 'User already exists' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    await pool.query('INSERT INTO account_data (email, username, password) VALUES (?, ?, ?)', [email, username, hashedPassword]);
    const [newUser] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    return res.json({
      success: true,
      message: 'Registration successful',
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

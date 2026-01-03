const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const pool = require('../utils/db')
const session = require('express-session')
const RedisStore = require('connect-redis').default
const { createClient } = require('redis')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
require('dotenv').config()

const JWT_SECRET = process.env.JWT_SECRET
const IS_PROD = process.env.NODE_ENV === 'production'

const redisClient = createClient({
  url: process.env.REDIS_URL,
  legacyMode: true
})

redisClient.connect().catch(() => {})

const router = express.Router()

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS
  }
})

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const [results] = await pool.query(
      'SELECT * FROM account_data WHERE email = ?',
      [email]
    )
    if (!results.length) return done(null, false, { message: 'Invalid credentials' })

    const user = results[0]
    if (!bcrypt.compareSync(password, user.password)) {
      return done(null, false, { message: 'Invalid credentials' })
    }
    if (!user.verified || user.verified === 'false') {
      return done(null, false, { message: 'Email needs to be verified' })
    }
    done(null, user)
  } catch (err) {
    done(err)
  }
}))

passport.serializeUser((user, done) => done(null, user.userid))

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM account_data WHERE id = ?',
      [id]
    )
    if (!rows.length) return done(null, false)
    done(null, rows[0])
  } catch (err) {
    done(err)
  }
})

router.use(session({
  store: new RedisStore({ client: redisClient }),
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 30
  }
}))

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || 'Login failed',
        resend: info?.message === 'Email needs to be verified'
      })
    }

    req.logIn(user, err => {
      if (err) return next(err)

      const token = jwt.sign(
        {
          id: user.userid,
          email: user.email,
          username: user.username,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '30m' }
      )

      res.cookie('auth', token, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'strict',
        maxAge: 30 * 60 * 1000
      })

      res.json({
        success: true,
        user: {
          id: user.userid,
          email: user.email,
          username: user.username,
          role: user.role
        }
      })
    })
  })(req, res, next)
})

router.post('/logout', (req, res) => {
  res.clearCookie('auth', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict'
  })
  req.logout(() => {
    res.json({ success: true })
  })
})

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body

  try {
    const [existing] = await pool.query(
      'SELECT id FROM account_data WHERE email = ?',
      [email]
    )
    if (existing.length) {
      return res.json({ success: false, message: 'User already exists' })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' })
    const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`

    await transporter.sendMail({
      from: process.env.ZOHO_USER,
      to: email,
      subject: 'Verify your email',
      text: `Click here to verify your account: ${verificationLink}`
    })

    await pool.query(
      'INSERT INTO account_data (email, username, password, verified) VALUES (?, ?, ?, ?)',
      [email, username, hashedPassword, false]
    )

    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false })
  }
})

module.exports = router
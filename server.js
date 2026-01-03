require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const RedisStore = require('connect-redis').default
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const slowDown = require('express-slow-down')
const helmet = require('helmet')
const compression = require('compression')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const path = require('path')
const fs = require('fs')

const redisClient = require('./utils/redisClient')
const createTables = require('./utils/createTables')

const cartRoutes = require('./routes/cartRoutes')
const userRoutes = require('./routes/userRoutes')
const emailRoutes = require('./routes/emailRoutes')
const loginRoutes = require('./routes/loginRoutes')
const ticketRoutes = require('./routes/ticketRoutes')
const careerRoutes = require('./routes/careerRoutes')
const updateRoutes = require('./routes/updateRoutes')
const paypalRoutes = require('./routes/paypalRoutes')
const versionRoutes = require('./routes/versionRoutes')
const downloadRoutes = require('./routes/downloadRoutes')

const app = express()
app.set('trust proxy', 1)

const allowedOrigins = new Set([
  'https://unendangered-mia-graceful.ngrok-free.dev',
  'https://support.natemarcellus.com',
  'https://files.natemarcellus.com',
  'https://www.natemarcellus.com',
  'http://localhost:3000'
])

mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})

createTables()

app.use(helmet())
app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use(csrfGuard)
app.use(cookieParser())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) cb(null, true)
    else cb(new Error('Not allowed'))
  },
  credentials: true
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
})

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500
})

app.use(limiter)
app.use(speedLimiter)

app.use(session({
  store: new RedisStore({ client: redisClient }),
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 2
  }
}))

const csrfGuard = (req, res, next) => {
  const method = req.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next()
  }

  const origin = req.headers.origin
  const referer = req.headers.referer

  if (origin && allowedOrigins.has(origin)) {
    return next()
  }

  if (referer) {
    try {
      const url = new URL(referer)
      if (allowedOrigins.has(url.origin)) {
        return next()
      }
    } catch {}
  }

  return res.status(403).json({ error: 'csrf_blocked' })
}

const validateToken = (req, res, next) => {
  const token =
    req.cookies.auth ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1])

  if (!token) return res.sendStatus(401)

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403)
    req.user = decoded
    next()
  })
}

const initializeDownloadSchema = async () => {
  const dir = path.join(__dirname, 'files/applications')
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) {
      await redisClient.setNX(`downloads:${name}`, '0')
    }
  }
}

initializeDownloadSchema()

app.use('/sso', csrfGuard, loginRoutes)
app.use('/email', csrfGuard, emailRoutes)
app.use('/cart', csrfGuard, cartRoutes)

app.use('/version', versionRoutes)
app.use('/updates', updateRoutes)
app.use('/paypal-api', paypalRoutes)
app.use('/download', downloadRoutes)

app.use('/user', validateToken, userRoutes)
app.use('/tickets', validateToken, ticketRoutes)
app.use('/careers', careerRoutes)

app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'))
})

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' })
})

const server = app.listen(5000)

process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const redisClient = require('./utils/redisClient');

const loginRoutes = require('./routes/loginRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const versionRoutes = require('./routes/versionRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const userRoutes = require('./routes/userRoutes');
const careerRoutes = require('./routes/careerRoutes');

const app = express();

const mongoURI = process.env.MONGO_URI;
const mongoOptions = {};

const allowedOrigins = [
  'https://support.natemarcellus.com',
  'https://files.natemarcellus.com',
  'https://www.natemarcellus.com',
  'http://localhost:3000'
];

mongoose.connect(mongoURI, mongoOptions)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, sameSite: 'lax' },
}));

app.use((req, res, next) => {
  if (req.method === 'POST') console.log(`POST ${req.url}`, req.body);
  next();
});

const validateToken = (req, res, next) => {
  const token = req.cookies.auth || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Unauthorized' });
    req.user = decoded;
    next();
  });
};

const validateInternal = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.INTERNAL_SECRET);
    if (decoded.service !== 'bot') throw new Error();
    next();
  } catch {
    res.status(403).json({ error: 'Unauthorized' });
  }
};

const initializeDownloadSchema = async () => {
  const applicationsDir = path.join(__dirname, 'files/applications');
  if (!fs.existsSync(applicationsDir)) return;
  const applications = fs.readdirSync(applicationsDir);
  for (const appName of applications) {
    const appPath = path.join(applicationsDir, appName);
    if (fs.statSync(appPath).isDirectory()) {
      const redisKey = `downloads:${appName}`;
      try {
        const exists = await redisClient.exists(redisKey);
        if (!exists) await redisClient.set(redisKey, 0);
      } catch (err) {
        console.error(err);
      }
    }
  }
};

initializeDownloadSchema().catch(console.error);

app.use('/sso', loginRoutes);
app.use(express.static('public'));
app.use('/careers', validateToken, careerRoutes);
app.use('/version', validateInternal, versionRoutes);
app.use('/download', downloadRoutes);
app.use('/user', validateToken, userRoutes);
app.use('/tickets', validateToken, ticketRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

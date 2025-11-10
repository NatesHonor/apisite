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
  'https://natemarcellus.com',
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

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}));

app.use(bodyParser.json());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log(`Received POST request to ${req.url}`);
    console.log('Request data:', req.body);
  }
  next();
});

app.use((req, res, next) => {
  if (req.path === '/') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (apiKey !== process.env.API_KEY) {
   // return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }

  next();
});

const validateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided or invalid format' });
  }

  const bearerToken = authHeader.split(' ')[1];

  jwt.verify(bearerToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    next();
  });
};


const initializeDownloadSchema = async () => {
  const applicationsDir = path.join(__dirname, 'files/applications');
  if (!fs.existsSync(applicationsDir)) {
    return console.warn(`⚠️ Directory not found: ${applicationsDir}`);
  }

  const applications = fs.readdirSync(applicationsDir);
  for (const appName of applications) {
    const appPath = path.join(applicationsDir, appName);
    if (fs.statSync(appPath).isDirectory()) {
      const redisKey = `downloads:${appName}`;

      try {
        const exists = await redisClient.exists(redisKey);
        if (!exists) {
          await redisClient.set(redisKey, 0);
          console.log(`✅ Added download record for ${appName}`);
        } else {
          console.log(`ℹ️ Record already exists for ${appName}`);
        }
      } catch (err) {
        console.error(`❌ Error processing ${appName}:`, err);
      }
    }
  }
};

initializeDownloadSchema().catch(console.error);

app.use('/sso', loginRoutes);
app.use(express.static('public'));
app.use('/careers', careerRoutes);
app.use('/version', versionRoutes);
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

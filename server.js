const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const loginRoutes = require('./routes/loginRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const versionRoutes = require('./routes/versionRoutes');
const fakenetworkRoutes = require('./routes/fakenetworkRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const app = express();

const redisClient = createClient({
  url: process.env.REDIS_URL,
  legacyMode: false
});

redisClient.on('connect', () => {
  console.log('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.connect().catch(console.error);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(bodyParser.json());
app.use(cors());

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
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  
  next();
});

const validateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  console.log('Token received for validation:', token);
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  });
};


app.use('/tickets', validateToken, ticketRoutes);

app.use('/sso', loginRoutes);
app.use('/download', downloadRoutes);
app.use('/version', versionRoutes);
app.use('/fakenetwork', fakenetworkRoutes);
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

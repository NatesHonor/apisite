const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
require('dotenv').config();

const loginRoutes = require('./routes/loginRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const versionRoutes = require('./routes/versionRoutes');
const fakenetworkRoutes = require('./routes/fakenetworkRoutes');

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

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log(`Received POST request to ${req.url}`);
    console.log('Request data:', req.body);
  }
  next();
});

app.use((req, res, next) => {
  const isPublicRoute = req.path === '/version/missionchief';
  
  if (isPublicRoute) {
    return next();
  }

  if (req.path !== '/' && req.path !== '/version' && req.method !== 'GET' || req.path !== '/' && req.path !== '/version' && req.method !== 'POST') {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) {
      return res.status(403).json({ error: 'Forbidden: Invalid API key' });
    }
  }
  next();
});

app.use('/sso', loginRoutes);
app.use('/download', downloadRoutes);
app.use('/version', versionRoutes);
app.use('/fakenetwork', fakenetworkRoutes);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nate's Services API</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          text-align: center;
          background-color: #f0f0f0;
          color: #333;
          margin: 0;
          padding: 0;
        }
        header {
          background-color: #0078D7;
          color: white;
          padding: 20px 0;
        }
        header h1 {
          margin: 0;
        }
        main {
          padding: 20px;
        }
        footer {
          background-color: #333;
          color: white;
          padding: 10px 0;
          position: fixed;
          width: 100%;
          bottom: 0;
        }
        footer a {
          color: #0078D7;
          text-decoration: none;
          margin: 0 10px;
        }
        .warning {
          color: red;
          font-weight: bold;
        }
        .usage {
          margin-top: 20px;
          font-size: 1.2em;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>Nate's Services API</h1>
      </header>
      <main>
        <h2>Status 200 OK</h2>
        <p>Welcome to Nate's Services API!</p>
        <p class="warning">Unauthorized use of this API is prohibited.</p>
        <div class="usage">
          <p>For usage information, visit <a href="https://docs.natemarcellus.com">docs.natemarcellus.com</a></p>
        </div>
      </main>
      <footer>
        <p>© 2024 Nate's Services. All rights reserved.</p>
        <p>
          <a href="https://support.natemarcellus.com">Support</a> |
          <a href="https://files.natemarcellus.com">Files</a> |
          <a href="https://links.natemarcellus.com">Links</a>
        </p>
      </footer>
    </body>
    </html>
  `);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

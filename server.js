const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const { createPool } = require('generic-pool');
require('dotenv').config();

const loginRoutes = require('./routes/loginRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const versionRoutes = require('./routes/versionRoutes');
const fakenetworkRoutes = require('./routes/fakenetworkRoutes');

const app = express();

// Create a Redis client factory
const redisClientFactory = {
  create: async () => {
    const client = createClient({
      url: process.env.REDIS_URL,
      legacyMode: true,
    });
    await client.connect();
    return client;
  },
  destroy: async (client) => {
    await client.quit();
  },
};

const redisPool = createPool(redisClientFactory, {
  max: 10, // maximum size of the pool
  min: 2,  // minimum size of the pool
});

// Custom Redis store to use with the pool
class RedisStoreWithPool extends RedisStore {
  async get(key, callback) {
    const client = await redisPool.acquire();
    try {
      const value = await super.get(key, callback);
      return value;
    } finally {
      redisPool.release(client);
    }
  }

  async set(key, value, callback) {
    const client = await redisPool.acquire();
    try {
      await super.set(key, value, callback);
    } finally {
      redisPool.release(client);
    }
  }

  async del(key, callback) {
    const client = await redisPool.acquire();
    try {
      await super.del(key, callback);
    } finally {
      redisPool.release(client);
    }
  }
}

// Use RedisStore with connection pool
app.use(session({
  store: new RedisStoreWithPool({
    client: redisPool,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }, // Change to true if using HTTPS
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

app.use('/sso', loginRoutes);
app.use('/download', downloadRoutes);
app.use('/version', versionRoutes);
app.use('/fakenetwork', fakenetworkRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'Status 200 OK' });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

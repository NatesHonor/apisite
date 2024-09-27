const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const loginRoutes = require('./routes/loginRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const versionRoutes = require('./routes/versionRoutes');
const fakenetworkRoutes = require('./routes/fakenetworkRoutes');
const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(passport.initialize()); 
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

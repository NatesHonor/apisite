const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const loginRoutes = require('./routes/loginRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const versionRoutes = require('./routes/versionRoutes');
const fakenetworkRoutes = require('./routes/fakenetworkRoutes'); // Import the new route
const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log(`Received POST request to ${req.url}`);
    console.log('Request data:', req.body);
  }
  next();
});

app.use('/api', loginRoutes);
app.use('/download', downloadRoutes);
app.use('/version', versionRoutes);
app.use('/fakenetwork', fakenetworkRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const router = express.Router();

const versions = {
  missionchief: '1.0.0',
  testroute: '2.0.1',
};

router.get('/:appName', (req, res) => {
  const { appName } = req.params;
  const version = versions[appName];
  
  if (version) {
    res.json({ version });
  } else {
    res.status(404).json({ error: 'Version not found' });
  }
});

module.exports = router;

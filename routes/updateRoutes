const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const updatesFile = path.join(__dirname, '../files/updates/missionchieflauncher.json');

router.get('/missionchieflauncher', (req, res) => {
  try {
    if (!fs.existsSync(updatesFile)) {
      return res.status(404).json({ error: 'Updates file not found' });
    }
    const data = JSON.parse(fs.readFileSync(updatesFile, 'utf8'));
    res.json({
      latest_version: data.latest_version,
      update_url: data.update_url
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read updates file' });
  }
});

module.exports = router;

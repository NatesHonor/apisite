const express = require('express');
const axios = require('axios');
const router = express.Router();

const versions = {
  anotherApp: '2.0.1',
};

router.get('/:appName', async (req, res) => {
  const { appName } = req.params;

  if (appName === 'missionchief') {
    try {
      const response = await axios.get('https://github.com/NatesHonor/MissionchiefBot/releases/latest', {
        maxRedirects: 0,
        validateStatus: status => status === 302,
      });

      const latestVersionUrl = response.headers.location; 
      const versionwithv = latestVersionUrl.split('/').pop().replace('tag/', ''); 
      const version = versionwithv.replace('v', '')

      return res.json({ version });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch the latest version from GitHub' });
    }
  } else if (versions[appName]) {
    return res.json({ version: versions[appName] });
  } else {
    return res.status(404).json({ error: 'Version not found' });
  }
});

module.exports = router;

const express = require('express');
const axios = require('axios');
const router = express.Router();

const versions = {
  anotherApp: '2.0.1',
};

function compareVersions(a, b) {
  const parseVersion = (version) => {
    const parts = version.replace('v', '').split(/[\.-]/);
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10) || 0;
    const patch = parseInt(parts[2], 10) || 0;
    const preRelease = parts.slice(3).join('-') || '';
    return { major, minor, patch, preRelease };
  };

  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  if (aParts.major !== bParts.major) return aParts.major - bParts.major;
  if (aParts.minor !== bParts.minor) return aParts.minor - bParts.minor;
  if (aParts.patch !== bParts.patch) return aParts.patch - bParts.patch;
  if (aParts.preRelease && !bParts.preRelease) return -1;
  if (!aParts.preRelease && bParts.preRelease) return 1;
  return 0;
}

router.get('/:appName', async (req, res) => {
  const { appName } = req.params;

  if (appName === 'missionchief') {
    try {
      const response = await axios.get('https://api.github.com/repos/NatesHonor/MissionchiefBot/tags');
      const tags = response.data;

      if (tags.length === 0) {
        return res.status(404).json({ error: 'No versions found' });
      }

      const versionNumbers = tags.map(tag => tag.name.replace('v', ''));
      const betaVersions = versionNumbers.filter(version => version.includes('-BETA'));
      const stableVersions = versionNumbers.filter(version => !version.includes('-BETA'));

      stableVersions.sort(compareVersions);
      const latestVersion = stableVersions.pop() || null;

      return res.json({
        latest: latestVersion,
        versions: stableVersions.reverse(),
        beta: betaVersions,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch versions from GitHub' });
    }
  } else if (versions[appName]) {
    return res.json({ version: versions[appName] });
  } else {
    return res.status(404).json({ error: 'Version not found' });
  }
});

module.exports = router;

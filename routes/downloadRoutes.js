const express = require('express');
const path = require('path');
const fs = require('fs');
const redisClient = require('../utils/redisClient');
const router = express.Router();

const trackDownload = async (appKey) => {
  try {
    const newCount = await redisClient.incr(`downloads:${appKey}`);
  } catch (err) {
    console.error(`Failed to track download for ${appKey}:`, err);
  }
};

router.get('/info/:application', async (req, res) => {
  try {
    const appName = req.params.application;
    const count = await redisClient.get(`downloads:${appName}`);
    if (count === null) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ name: appName, downloads: Number(count) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:application/:version', async (req, res) => {
  const { application, version } = req.params;
  const baseDir = path.join(__dirname, '../files/applications', application);
  const appKey = application;
  const possibleFiles = version === 'latest'
    ? [path.join(baseDir, 'latest.exe'), path.join(baseDir, 'latest.zip')]
    : [path.join(baseDir, `${version}.exe`), path.join(baseDir, `${version}.zip`)];
  let filePath = null;
  for (const file of possibleFiles) {
    try {
      await fs.promises.access(file, fs.constants.F_OK);
      filePath = file;
      break;
    } catch {}
  }
  if (!filePath) return res.status(404).json({ success: false, message: 'File not found' });
  try {
    await trackDownload(appKey);
  } catch (err) {
    console.error(`Error tracking download for ${appKey}:`, err);
  }
  res.download(filePath, (err) => {
    if (err && !res.headersSent) res.status(500).json({ success: false, message: 'Error during download' });
  });
});

module.exports = router;

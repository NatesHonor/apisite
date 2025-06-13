const express = require('express');
const path = require('path');
const fs = require('fs');
const redisClient = require('../utils/redisClient');
const router = express.Router();
const trackDownload = async (appKey) => {
  try {
    console.log('Tracking download for:', appKey);
    const newCount = await redisClient.incr(`downloads:${appKey}`);
    console.log(`New download count for ${appKey}: ${newCount}`);
  } catch (err) {
    console.error(`Failed to track download for ${appKey}:`, err);
  }
};

router.get('/info/:application', async (req, res) => {
  try {
    const appName = req.params.application;
    const count = await redisClient.get(`downloads:${appName}`);

    if (count === null) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ name: appName, downloads: Number(count) });
  } catch (error) {
    console.error('Error fetching download info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:application/:version', async (req, res) => {
  const { application, version } = req.params;
  const fileName = version === 'latest' ? 'latest.zip' : `${version}.zip`;
  const filePath = path.join(__dirname, '../files/applications', application, fileName);
  const appKey = application;

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch {
    console.log(`404 Error: File not found at ${filePath}`);
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  try {
    await trackDownload(appKey);
  } catch (err) {
    console.error(`Error tracking download for ${appKey}:`, err);
  }

  res.download(filePath, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: 'Error during download' });
      }
    }
  });
});

module.exports = router;

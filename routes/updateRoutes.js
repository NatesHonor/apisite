const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const router = express.Router();
const missionLauncherFile = path.join(__dirname, '../files/updates/missionlauncher.json');
const missionHelperFile = path.join(__dirname, '../files/updates/missionhelper.json');

router.get('/missionlauncher', async (req, res) => {
  try {
    const raw = await fs.readFile(missionLauncherFile, 'utf8');
    const data = JSON.parse(raw);

    if (!data.version || !data.url || !data.checksum || !data.signature) {
      return res.status(400).json({ error: 'Invalid manifest: missing required fields' });
    }

    res.json({
      version: data.version,
      url: data.url,
      checksum: data.checksum,
      signature: data.signature,
      notes: data.notes || [],
      mandatory: !!data.mandatory,
      release_date: data.release_date || null,
      size: data.size || null,
      platform: data.platform || 'windows-x64'
    });
  } catch (err) {
    console.error('Manifest read error:', err);
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Updates file not found' });
    return res.status(500).json({ error: 'Failed to read updates file' });
  }
});


router.get('/missionhelper', async (req, res) => {
  try {
    const raw = await fs.readFile(missionHelperFile, 'utf8');
    const data = JSON.parse(raw);

    if (!data.version || !data.url  || !data.mandatory) {
      return res.status(400).json({ error: 'Invalid manifest: missing required fields' });
    }

    res.json({
      version: data.version,
      mandatory: !!data.mandatory,
      url: data.url,
    });
  } catch (err) {
    console.error('Manifest read error:', err);
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Updates file not found' });
    return res.status(500).json({ error: 'Failed to read updates file' });
  }
});

module.exports = router;

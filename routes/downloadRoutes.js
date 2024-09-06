const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePathWithExtension = path.join(__dirname, '../files/applications/', filename);
  const filePathWithoutExtensionExe = path.join(__dirname, '../files/applications/', `${filename}.exe`);
  const filePathWithoutZip = filename === 'MissionchiefBot-Latest' ? path.join(__dirname, '../files/applications/', 'MissionchiefBot-Latest.zip') : null;

  if (fs.existsSync(filePathWithExtension)) {
    res.download(filePathWithExtension, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, message: 'File not found or server error' });
      }
    });
  } else if (filePathWithoutZip && fs.existsSync(filePathWithoutZip)) {
    res.download(filePathWithoutZip, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, message: 'File not found or server error' });
      }
    });
  } else if (fs.existsSync(filePathWithoutExtensionExe)) {
    res.download(filePathWithoutExtensionExe, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, message: 'File not found or server error' });
      }
    });
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

module.exports = router;

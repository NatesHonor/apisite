const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePathWithExtension = path.join(__dirname, '../files/applications/', filename);
  const filePathWithoutExtension = path.join(__dirname, '../files/applications/', `${filename}.exe`); // Assuming .exe as the extension
  if (fs.existsSync(filePathWithExtension)) {
    res.download(filePathWithExtension, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, message: 'File not found or server error' });
      }
    });
  } else if (fs.existsSync(filePathWithoutExtension)) {
    res.download(filePathWithoutExtension, (err) => {
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

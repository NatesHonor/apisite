const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../files/applications/', filename);

  res.download(filePath, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).json({ success: false, message: 'File not found or server error' });
    }
  });
});

module.exports = router;

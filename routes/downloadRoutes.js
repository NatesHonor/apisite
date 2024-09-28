const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const downloadInfoPath = path.join(__dirname, '../files/downloadInfo.json');

const loadDownloadInfo = () => {
  if (fs.existsSync(downloadInfoPath)) {
    const data = fs.readFileSync(downloadInfoPath, 'utf8');
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return {};
    }
  }
  return {};
};

const saveDownloadInfo = (info) => {
  fs.writeFileSync(downloadInfoPath, JSON.stringify(info, null, 2));
};

const initializeDownloadInfo = () => {
  const filesDir = path.join(__dirname, '../files/applications/');
  const files = fs.readdirSync(filesDir);
  const downloadInfo = loadDownloadInfo();

  files.forEach((file) => {
    const filePath = path.join(filesDir, file);
    const stats = fs.statSync(filePath);
    if (!downloadInfo[file]) {
      downloadInfo[file] = {
        name: file,
        size: stats.size,
        downloads: 0,
      };
    }
  });

  saveDownloadInfo(downloadInfo);
};

initializeDownloadInfo();

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePathWithExtension = path.join(__dirname, '../files/applications/', filename);
  const filePathWithoutExtensionExe = path.join(__dirname, '../files/applications/', `${filename}.exe`);
  const filePathWithoutZip = path.join(__dirname, '../files/applications/', `${filename}.zip`);

  const downloadInfo = loadDownloadInfo();

  const incrementDownloadCount = (file) => {
    if (downloadInfo[file]) {
      downloadInfo[file].downloads += 1;
      saveDownloadInfo(downloadInfo);
    }
  };

  if (fs.existsSync(filePathWithExtension)) {
    res.download(filePathWithExtension, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, message: 'File not found or server error' });
      } else {
        incrementDownloadCount(filename);
      }
    });
  } else if (fs.existsSync(filePathWithoutZip)) {
    res.download(filePathWithoutZip, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, message: 'File not found or server error' });
      } else {
        incrementDownloadCount(`${filename}.zip`);
      }
    });
  } else if (fs.existsSync(filePathWithoutExtensionExe)) {
    res.download(filePathWithoutExtensionExe, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, message: 'File not found or server error' });
      } else {
        incrementDownloadCount(`${filename}.exe`);
      }
    });
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

router.get('/info/:filename', (req, res) => {
  const { filename } = req.params;
  const downloadInfo = loadDownloadInfo();

  const fileInfo = downloadInfo[filename] || downloadInfo[`${filename}.zip`] || downloadInfo[`${filename}.exe`];

  if (fileInfo) {
    res.json(fileInfo);
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

module.exports = router;

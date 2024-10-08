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
  const applicationsDir = path.join(__dirname, '../files/');
  const applications = fs.readdirSync(applicationsDir);
  const downloadInfo = loadDownloadInfo();

  applications.forEach((application) => {
    const appDir = path.join(applicationsDir, application);
    if (fs.statSync(appDir).isDirectory()) {
      const versions = fs.readdirSync(appDir);
      versions.forEach((version) => {
        const filePath = path.join(appDir, version);
        const stats = fs.statSync(filePath);
        if (!downloadInfo[`${application}/${version}`]) {
          downloadInfo[`${application}/${version}`] = {
            name: version,
            size: stats.size,
            downloads: 0,
          };
        }
      });
    }
  });

  saveDownloadInfo(downloadInfo);
};

initializeDownloadInfo();

router.get('/:application/:version', (req, res) => {
  const { application, version } = req.params;
  const filePath = path.join(__dirname, '../files/', application, version, `${version}.zip`);

  const downloadInfo = loadDownloadInfo();

  const incrementDownloadCount = (file) => {
    if (downloadInfo[file]) {
      downloadInfo[file].downloads += 1;
      saveDownloadInfo(downloadInfo);
    }
  };

  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, message: 'File not found or server error' });
      } else {
        incrementDownloadCount(`${application}/${version}.zip`);
      }
    });
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

router.get('/info/:application', (req, res) => {
  const { application } = req.params;
  const downloadInfo = loadDownloadInfo();

  const fileInfo = Object.keys(downloadInfo).find(file => file.startsWith(application));

  if (fileInfo) {
    res.json(downloadInfo[fileInfo]);
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

module.exports = router;

const express = require('express')
const path = require('path')
const fs = require('fs')
const redisClient = require('../utils/redisClient')

const router = express.Router()

const BASE_DIR = path.resolve(__dirname, '../files/applications')
const APP_REGEX = /^[a-zA-Z0-9_-]+$/
const VERSION_REGEX = /^(latest|\d+\.\d+\.\d+)$/

const trackDownload = async (appKey) => {
  try {
    await redisClient.incr(`downloads:${appKey}`)
  } catch (err) {
    console.error('Download tracking failed', err)
  }
}

router.get('/info/:application', async (req, res) => {
  const appName = req.params.application

  if (!APP_REGEX.test(appName)) {
    return res.status(400).json({ success: false })
  }

  try {
    const count = await redisClient.get(`downloads:${appName}`)
    if (count === null) {
      return res.status(404).json({ success: false })
    }
    res.json({ name: appName, downloads: Number(count) })
  } catch {
    res.status(500).json({ success: false })
  }
})

router.get('/:application/:version', async (req, res) => {
  const { application, version } = req.params

  if (!APP_REGEX.test(application) || !VERSION_REGEX.test(version)) {
    return res.status(400).json({ success: false })
  }

  const appDir = path.resolve(BASE_DIR, application)
  if (!appDir.startsWith(BASE_DIR)) {
    return res.status(403).json({ success: false })
  }

  const filenames =
    version === 'latest'
      ? ['latest.exe', 'latest.zip']
      : [`${version}.exe`, `${version}.zip`]

  let filePath = null

  for (const name of filenames) {
    const resolved = path.resolve(appDir, name)
    if (!resolved.startsWith(appDir)) continue
    try {
      await fs.promises.access(resolved, fs.constants.R_OK)
      filePath = resolved
      break
    } catch {}
  }

  if (!filePath) {
    return res.status(404).json({ success: false })
  }

  trackDownload(application)

  res.download(filePath, err => {
    if (err && !res.headersSent) {
      res.status(500).json({ success: false })
    }
  })
})

module.exports = router
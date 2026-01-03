const express = require('express')
const jwt = require('jsonwebtoken')
const Career = require('../models/Career')
const Application = require('../models/Application')
const drive = require('../utils/googleDrive')
const rateLimit = require('express-rate-limit')

const router = express.Router()

const validateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.sendStatus(401)

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403)
    req.user = decoded
    next()
  })
}

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
})

router.get('/list', async (req, res) => {
  try {
    const careers = await Career.find()
    res.json(careers)
  } catch {
    res.status(500).json({ error: 'Failed to fetch career listings' })
  }
})

router.get('/details/:jobID', async (req, res) => {
  try {
    const job = await Career.findOne({ jobID: req.params.jobID })
    if (!job) return res.sendStatus(404)
    res.json(job)
  } catch {
    res.status(500).json({ error: 'Failed to fetch job details' })
  }
})

router.post('/post', validateToken, async (req, res) => {
  try {
    const jobID = Math.floor(Math.random() * 9000000) + 1000000
    const career = new Career({
      ...req.body,
      jobID: jobID.toString()
    })
    await career.save()
    res.status(201).json(career)
  } catch {
    res.status(400).json({ error: 'Failed to post career' })
  }
})

router.post('/upload-session', uploadLimiter, validateToken, async (req, res) => {
  const { filename, mimeType } = req.body

  if (!filename || !mimeType) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    const response = await drive.files.create(
      {
        requestBody: {
          name: filename,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        },
        media: {
          mimeType
        }
      },
      {
        uploadType: 'resumable'
      }
    )

    res.json({
      uploadUrl: response.headers.location
    })
  } catch {
    res.status(500).json({ error: 'Failed to create upload session' })
  }
})

router.post('/apply', async (req, res) => {
  try {
    const { driveFileId, ...data } = req.body

    if (!driveFileId) {
      return res.status(400).json({ error: 'Missing resume' })
    }

    const application = new Application({
      ...data,
      resumeFileId: driveFileId
    })

    await application.save()
    res.status(201).json(application)
  } catch {
    res.status(400).json({ error: 'Failed to submit application' })
  }
})

module.exports = router
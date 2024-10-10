const express = require('express');
const Career = require('../models/Career');
const Application = require('../models/Application');

const router = express.Router();

router.get('/list', async (req, res) => {
  try {
    const careers = await Career.find();
    res.json(careers);
  } catch (error) {
    console.error('Error fetching career listings:', error);
    res.status(500).json({ error: 'Failed to fetch career listings' });
  }
});

router.get('/details/:jobID', async (req, res) => {
  try {
    const { jobID } = req.params;
    const job = await Career.findOne({ jobID });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});


router.post('/post', async (req, res) => {
    try {
      const jobID = Math.floor(Math.random() * 9000000) + 1000000;
  
      const newCareer = new Career({
        ...req.body,
        jobID: jobID.toString()
      });
      await newCareer.save();
      res.status(201).json(newCareer);
    } catch (error) {
      console.error('Error posting new career:', error);
      res.status(400).json({ error: 'Failed to post new career' });
    }
  });
  


router.post('/apply', async (req, res) => {
  try {
    const application = new Application(req.body);
    await application.save();
    res.status(201).json(application);
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(400).json({ error: 'Failed to submit application' });
  }
});

module.exports = router;

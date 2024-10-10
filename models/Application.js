const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobID: { type: String, required: true },
  applicantName: { type: String, required: true },
  applicantAge: { type: Number, required: true },
  availability: { type: String, required: true },
  coverLetter: { type: String, required: true },
  resume: { type: String, required: true },
  answers: [{ question: String, answer: String }]
});

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;

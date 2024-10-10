const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  jobID: { type: Number, required: true, unique: true },
  remote: { type: Boolean, default: true },
  jobTitle: { type: String, required: true },
  postingDate: { type: Date, default: Date.now },
  shortDescription: { type: String, required: true },
  requirements: { type: String, required: true },
  customQuestions: [{ type: String }],
  company: { type: String, required: true },
  tags: [{ type: String }]
});

const Career = mongoose.model('Career', careerSchema);

module.exports = Career;

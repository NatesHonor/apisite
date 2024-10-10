const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  jobID: { type: Number, required: true, unique: true },
  remote: { type: Boolean, default: true },
  positions: { type: Number, default: 1 },
  jobTitle: { type: String, required: true },
  postingDate: { type: Date, default: Date.now },
  shortDescription: { type: String, required: true },
  requirements: { type: String, required: true },
  customQuestions: [{ type: String }],
  salary: { type: String, required: true },
  company: { type: String, required: true },
  tags: [{ type: String }],
  category: { type: String, required: true },
  type: { type: String, required: true},
  benefits: { type: String, required: true}
});


const Career = mongoose.model('Career', careerSchema);

module.exports = Career;

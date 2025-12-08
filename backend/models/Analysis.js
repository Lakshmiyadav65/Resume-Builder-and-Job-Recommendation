const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  resumeText: {
    type: String,
    required: true,
  },
  jobDescription: {
    type: String,
    required: true,
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  semanticScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  skillScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  feedback: {
    type: String,
    required: true,
  },
  softSkillsRequired: [String],
  softSkillsPresent: [String],
  technicalSkillsRequired: [String],
  technicalSkillsPresent: [String],
  recommendations: [String],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Analysis', analysisSchema);

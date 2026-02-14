const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  personalInfo: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    linkedin: String,
    github: String,
    portfolio: String,
    location: String,
  },
  objective: {
    targetRole: String,
    summary: String,
  },
  education: [{
    university: { type: String, required: true },
    degree: { type: String, required: true },
    major: String,
    graduationYear: String,
    gpa: String,
    relevantCoursework: [String],
  }],
  experience: [{
    company: { type: String, required: true },
    role: { type: String, required: true },
    duration: String,
    startDate: String,
    endDate: String,
    current: Boolean,
    responsibilities: [String],
  }],
  skills: {
    technical: [String],
    soft: [String],
    languages: [String],
  },
  projects: [{
    name: { type: String, required: true },
    description: String,
    technologies: [String],
    githubLink: String,
    liveLink: String,
    duration: String,
    highlights: [String],
  }],
  certifications: [{
    name: String,
    issuer: String,
    date: String,
    credentialId: String,
  }],
  selectedTemplate: {
    type: String,
    default: 'modern',
    enum: ['modern', 'classic', 'minimal', 'creative']
  },
  status: {
    type: String,
    default: 'draft',
    enum: ['draft', 'completed', 'analyzed']
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Resume', resumeSchema);

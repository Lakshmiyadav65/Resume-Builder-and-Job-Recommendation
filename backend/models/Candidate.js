const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  // Company and Role information
  companyId: {
    type: String,
    index: true,
  },
  companyName: {
    type: String,
  },
  roleId: {
    type: String,
    index: true,
  },
  roleTitle: {
    type: String,
  },
  
  // Recruiter session information (for backward compatibility)
  recruiterId: {
    type: String,
    index: true,
  },
  sessionId: {
    type: String,
    index: true,
  },
  
  // Job description for this ranking session
  jobDescription: {
    type: String,
    required: true,
  },
  jobTitle: {
    type: String,
  },
  
  // Candidate resume information
  fileName: {
    type: String,
    required: true,
  },
  resumeText: {
    type: String,
    required: true,
  },
  
  // Extracted candidate details
  candidateName: {
    type: String,
    default: 'Unknown Candidate',
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  
  // AI Analysis Results
  rank: {
    type: Number,
    required: true,
  },
  fitScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  
  // Skills Analysis
  strengths: [{
    type: String,
  }],
  missingSkills: [{
    type: String,
  }],
  technicalSkillsPresent: [{
    type: String,
  }],
  softSkillsPresent: [{
    type: String,
  }],
  
  // Experience & Education
  yearsOfExperience: {
    type: Number,
  },
  education: {
    type: String,
  },
  
  // AI Justification
  justification: {
    type: String,
    required: true,
  },
  
  // Additional metadata
  resumeUploadDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'pending',
  },
  
  // Recruiter notes
  recruiterNotes: {
    type: String,
  },
  
  // Interview tracking
  interviewScheduled: {
    type: Boolean,
    default: false,
  },
  interviewDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Create indexes for better query performance
candidateSchema.index({ recruiterId: 1, sessionId: 1 });
candidateSchema.index({ fitScore: -1 });
candidateSchema.index({ rank: 1 });
candidateSchema.index({ status: 1 });

// Method to update candidate status
candidateSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  this.lastUpdated = Date.now();
  return this.save();
};

// Static method to get all candidates for a session
candidateSchema.statics.getSessionCandidates = function(sessionId) {
  return this.find({ sessionId }).sort({ rank: 1 });
};

// Static method to get top candidates for a session
candidateSchema.statics.getTopCandidates = function(sessionId, limit = 10) {
  return this.find({ sessionId })
    .sort({ fitScore: -1, rank: 1 })
    .limit(limit);
};

module.exports = mongoose.model('Candidate', candidateSchema);

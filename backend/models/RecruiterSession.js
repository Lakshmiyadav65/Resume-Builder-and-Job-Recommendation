const mongoose = require('mongoose');

const recruiterSessionSchema = new mongoose.Schema({
  // Session identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  recruiterId: {
    type: String,
    required: true,
    index: true,
  },
  
  // Job details
  jobDescription: {
    type: String,
    required: true,
  },
  jobTitle: {
    type: String,
  },
  companyName: {
    type: String,
  },
  location: {
    type: String,
  },
  
  // Technical requirements extracted from JD
  requiredTechnicalSkills: [{
    type: String,
  }],
  requiredSoftSkills: [{
    type: String,
  }],
  
  // Ranking statistics
  totalCandidates: {
    type: Number,
    default: 0,
  },
  shortlistedCount: {
    type: Number,
    default: 0,
  },
  rejectedCount: {
    type: Number,
    default: 0,
  },
  
  // Session status
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active',
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Update last activity timestamp
recruiterSessionSchema.methods.updateActivity = function() {
  this.lastActivityAt = Date.now();
  return this.save();
};

// Complete the session
recruiterSessionSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = Date.now();
  return this.save();
};

// Static method to get active sessions for a recruiter
recruiterSessionSchema.statics.getActiveSessions = function(recruiterId) {
  return this.find({ recruiterId, status: 'active' })
    .sort({ lastActivityAt: -1 });
};

module.exports = mongoose.model('RecruiterSession', recruiterSessionSchema);

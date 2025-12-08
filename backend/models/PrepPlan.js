const mongoose = require('mongoose');

const prepPlanSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
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
  days: {
    type: Number,
    required: true,
    min: 1,
  },
  planText: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

prepPlanSchema.index({ sessionId: 1, days: 1 });

module.exports = mongoose.model('PrepPlan', prepPlanSchema);

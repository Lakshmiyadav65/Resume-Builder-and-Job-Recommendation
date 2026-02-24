const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    recruiterId: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'stage1_in_progress', 'stage2_in_progress', 'completed', 'failed', 'expired'],
        default: 'pending'
    },
    currentStage: {
        type: Number,
        default: 1
    },
    questions: [{
        stage: Number,
        question: String,
        expectedAnswerKeywords: [String],
        actualAnswer: String,
        score: Number,
        rating: String, // 'poor', 'fair', 'good', 'excellent'
        feedback: String
    }],
    overallScore: {
        type: Number,
        default: 0
    },
    passThreshold: {
        type: Number,
        default: 60
    },
    analysis: {
        confidenceScore: Number,
        communicationRating: String,
        resumeMatchScore: Number,
        culturalFit: Number,
        technicalDepth: Number
    },
    transcript: [{
        speaker: String,
        text: String,
        timestamp: Date
    }],
    resultPublished: {
        type: Boolean,
        default: false
    },
    reportSentAt: Date
}, {
    timestamps: true
});

interviewSessionSchema.index({ token: 1 });
interviewSessionSchema.index({ candidateId: 1 });
interviewSessionSchema.index({ recruiterId: 1 });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);

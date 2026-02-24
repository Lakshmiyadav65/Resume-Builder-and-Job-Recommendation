const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const Candidate = require('../models/Candidate');
const InterviewSession = require('../models/InterviewSession');
const OpenAI = require('openai');

// Initialize Groq client
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

// Configure Email Transporter (Placeholder - usually use .env for credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send Interview Invite
router.post('/invite', async (req, res) => {
    try {
        const { candidateId, recruiterId } = req.body;

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });

        // Generate unique token
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiry

        const session = new InterviewSession({
            token,
            candidateId,
            recruiterId,
            expiresAt,
            status: 'pending'
        });

        await session.save();

        // Send Email
        const interviewLink = `${process.env.FRONTEND_URL}/interview/${token}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: candidate.email,
            subject: `Interview Invitation: ${candidate.jobTitle || 'AI Automated Interview'}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #6366f1;">Stage 1: AI Screening Interview</h2>
          <p>Hello <strong>${candidate.candidateName}</strong>,</p>
          <p>Congratulations! You have been shortlisted for the next stage of the hiring process for the <strong>${candidate.jobTitle || 'specified'}</strong> position.</p>
          <p>We invite you to participate in an AI-powered automated interview. This process consists of two stages:</p>
          <ul>
            <li><strong>Stage 1:</strong> Voice-only screening bot.</li>
            <li><strong>Stage 2:</strong> AI Avatar interaction (upon passing Stage 1).</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${interviewLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Interview</a>
          </div>
          <p style="color: #666; font-size: 12px;">This link is unique to you and will expire in 48 hours. Please ensure you are in a quiet environment with a working microphone.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Powered by AtScribe AI Recruitment Platform</p>
        </div>
      `
        };

        // Note: In real production, handle email sending errors
        // await transporter.sendMail(mailOptions);
        console.log(`[SIMULATED EMAIL] To: ${candidate.email} | Link: ${interviewLink}`);

        res.json({ success: true, token, expiresAt });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Validate Token
router.post('/validate', async (req, res) => {
    try {
        const { token } = req.body;
        const session = await InterviewSession.findOne({ token }).populate('candidateId');

        if (!session) return res.status(404).json({ success: false, error: 'Invalid interview link' });
        if (session.expiresAt < new Date()) return res.status(400).json({ success: false, error: 'Interview link has expired' });
        if (session.status === 'completed' || session.status === 'failed') return res.status(400).json({ success: false, error: 'Interview has already been conducted' });

        res.json({
            success: true,
            candidate: session.candidateId,
            status: session.status,
            currentStage: session.currentStage
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get/Generate Next Question
router.post('/question', async (req, res) => {
    try {
        const { token, stage } = req.body;
        const session = await InterviewSession.findOne({ token }).populate('candidateId');

        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        const candidate = session.candidateId;
        const prompt = `You are an expert technical recruiter. Based on the candidate's resume and job description, generate ONE interview question for Stage ${stage}.
    
    Candidate Resume: ${candidate.resumeText.substring(0, 2000)}
    Job Description: ${candidate.jobDescription.substring(0, 1000)}
    
    Previous Questions asked: ${session.questions.map(q => q.question).join(', ')}
    
    Return the output in JSON format:
    {
      "question": "The interview question",
      "expectedKeywords": ["keyword1", "keyword2"]
    }`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);

        res.json({ success: true, question: result.question });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Submit Answer for Evaluation
router.post('/answer', async (req, res) => {
    try {
        const { token, stage, question, answer } = req.body;
        const session = await InterviewSession.findOne({ token }).populate('candidateId');

        const prompt = `Evaluate the following interview answer for an AI screening round.
    Question: ${question}
    Candidate Answer: ${answer}
    
    JD Context: ${session.candidateId.jobDescription.substring(0, 500)}
    
    Return evaluation in JSON format:
    {
      "score": number (0-100),
      "rating": "poor" | "fair" | "good" | "excellent",
      "feedback": "short constructive feedback",
      "confidenceHint": number (0-100)
    }`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const evaluation = JSON.parse(completion.choices[0].message.content);

        session.questions.push({
            stage,
            question,
            actualAnswer: answer,
            score: evaluation.score,
            rating: evaluation.rating,
            feedback: evaluation.feedback
        });

        // Update Overall Score (averaging)
        const totalScore = session.questions.reduce((acc, q) => acc + q.score, 0);
        session.overallScore = totalScore / session.questions.length;

        await session.save();

        res.json({
            success: true,
            evaluation,
            overallScore: session.overallScore
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

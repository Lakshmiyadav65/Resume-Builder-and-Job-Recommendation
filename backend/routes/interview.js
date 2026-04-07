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
        const { candidateId, recruiterId, email, candidateName, jobTitle, mode, expiry } = req.body;

        // Try to find candidate in DB, but allow sending without one
        let candidate = null;
        let recipientEmail = email;
        let recipientName = candidateName || 'Candidate';
        let role = jobTitle || 'the position';

        if (candidateId && candidateId !== 'manual') {
            try {
                candidate = await Candidate.findById(candidateId);
                if (candidate) {
                    recipientEmail = email || candidate.email;
                    recipientName = candidateName || candidate.candidateName || 'Candidate';
                    role = jobTitle || candidate.jobTitle || 'the position';
                }
            } catch (_) { /* candidate not found, continue with manual data */ }
        }

        if (!recipientEmail) {
            return res.status(400).json({ success: false, error: 'Candidate email is required' });
        }

        // Generate unique token
        const token = uuidv4();
        const expiresAt = new Date();
        const expiryHours = parseInt(expiry) || 48;
        expiresAt.setHours(expiresAt.getHours() + expiryHours);

        const sessionData = {
            token,
            recruiterId: recruiterId || 'system',
            candidateEmail: recipientEmail,
            candidateName: recipientName,
            jobTitle: role,
            expiresAt,
            status: 'pending'
        };
        if (candidate) sessionData.candidateId = candidate._id;

        const session = new InterviewSession(sessionData);

        await session.save();

        // Build interview link
        const baseUrl = process.env.FRONTEND_URL || `http://localhost:3000`;
        const interviewLink = `${baseUrl}/interview/${token}`;

        // Send Email if credentials are configured
        const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

        if (emailConfigured) {
            const mailOptions = {
                from: `"CVtoCall AI" <${process.env.EMAIL_USER}>`,
                to: recipientEmail,
                subject: `Interview Invitation: ${role}`,
                html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">AI Interview Invitation</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Powered by CVtoCall</p>
                  </div>

                  <div style="padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; color: #1f2937; margin: 0 0 16px;">Hello <strong>${recipientName}</strong>,</p>

                    <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 16px;">
                      Congratulations! You have been shortlisted for the <strong style="color: #6366f1;">${role}</strong> position.
                      We invite you to participate in our AI-powered interview process.
                    </p>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0;">
                      <p style="font-size: 13px; font-weight: 700; color: #1f2937; margin: 0 0 12px;">Interview Details:</p>
                      <table style="width: 100%; font-size: 13px; color: #4b5563;">
                        <tr><td style="padding: 4px 0; font-weight: 600;">Format:</td><td>AI-Powered Voice Interview</td></tr>
                        <tr><td style="padding: 4px 0; font-weight: 600;">Duration:</td><td>15-25 minutes</td></tr>
                        <tr><td style="padding: 4px 0; font-weight: 600;">Expires:</td><td>${expiryHours} hours from now</td></tr>
                        <tr><td style="padding: 4px 0; font-weight: 600;">Requirements:</td><td>Chrome/Edge browser, working microphone</td></tr>
                      </table>
                    </div>

                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${interviewLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(99,102,241,0.3);">
                        Start Your Interview
                      </a>
                    </div>

                    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 24px 0 0;">
                      This link is unique to you and will expire in ${expiryHours} hours.<br>
                      Please ensure you are in a quiet environment with a working microphone and camera.
                    </p>
                  </div>

                  <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 11px;">
                    &copy; ${new Date().getFullYear()} CVtoCall AI Recruitment Platform
                  </div>
                </div>`
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`[EMAIL SENT] To: ${recipientEmail} | Link: ${interviewLink}`);
            } catch (emailErr) {
                console.error('[EMAIL ERROR]', emailErr.message);
                // Return success with warning - interview session was still created
                return res.json({
                    success: true,
                    token,
                    expiresAt,
                    interviewLink,
                    emailSent: false,
                    emailError: 'Email could not be sent. Please share the link manually.',
                });
            }
        } else {
            console.log(`[EMAIL NOT CONFIGURED] To: ${recipientEmail} | Link: ${interviewLink}`);
        }

        res.json({
            success: true,
            token,
            expiresAt,
            interviewLink,
            emailSent: emailConfigured,
        });
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

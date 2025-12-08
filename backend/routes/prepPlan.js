const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const PrepPlan = require('../models/PrepPlan');
const Analysis = require('../models/Analysis');

// Initialize Groq client (OpenAI-compatible)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// Retry helper function with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests') || error.message?.includes('Resource exhausted')) {
        if (i === maxRetries - 1) throw error;
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Rate limit hit, retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// POST /api/prep-plan/generate
router.post('/generate', async (req, res) => {
  try {
    const { sessionId, days } = req.body;

    if (!sessionId || !days) {
      return res.status(400).json({ error: 'Session ID and days are required' });
    }

    // Get analysis data
    const analysis = await Analysis.findOne({ sessionId });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found. Please complete analysis first.' });
    }

    // Check if plan already exists for this session and days
    const existingPlan = await PrepPlan.findOne({ sessionId, days });
    if (existingPlan) {
      return res.json({
        success: true,
        planText: existingPlan.planText,
      });
    }

    // Generate preparation plan with OpenAI
    const prompt = `
Resume: ${analysis.resumeText.substring(0, 1500)}
Job Description: ${analysis.jobDescription.substring(0, 1500)}

The candidate has ${days} days to prepare.

Missing Technical Skills: ${analysis.technicalSkillsRequired.filter(skill =>
      !analysis.technicalSkillsPresent.some(p =>
        p.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(p.toLowerCase())
      )
    ).join(', ')}

Missing Soft Skills: ${analysis.softSkillsRequired.filter(skill =>
      !analysis.softSkillsPresent.some(p =>
        p.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(p.toLowerCase())
      )
    ).join(', ')}

Current Skill Match Score: ${analysis.skillScore}%

Create a comprehensive, structured ${days}-day preparation plan that includes:

1. **Overview**: Brief assessment of current state vs. target
2. **Phase Breakdown**: Divide the ${days} days into logical phases (e.g., fundamentals, intermediate, advanced)
3. **Daily Schedule**: Specific daily tasks with time allocations
4. **Skill Focus Areas**: Prioritize missing skills and weak areas
5. **Resources**: Suggest specific learning materials, courses, practice platforms
6. **Milestones**: Weekly checkpoints and goals
7. **Mock Interviews**: Schedule practice sessions
8. **Resume Updates**: When and how to update resume as skills improve

Make it actionable, realistic, and tailored to the candidate's current level and the job requirements.
Format with clear headers, bullet points, and numbered lists for easy readability.
`;

    const completion = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert career coach and preparation plan creator. Create detailed, actionable preparation plans."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
    });

    const planText = completion.choices[0].message.content;

    // Save plan to database
    const prepPlan = new PrepPlan({
      sessionId,
      resumeText: analysis.resumeText,
      jobDescription: analysis.jobDescription,
      days,
      planText,
    });

    await prepPlan.save();

    res.json({
      success: true,
      planText,
    });
  } catch (error) {
    console.error('Prep Plan Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate preparation plan' });
  }
});

// GET /api/prep-plan/:sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const plans = await PrepPlan.find({ sessionId: req.params.sessionId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      plans: plans.map(p => ({
        days: p.days,
        planText: p.planText,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get Prep Plan Error:', error);
    res.status(500).json({ error: 'Failed to retrieve preparation plans' });
  }
});

module.exports = router;

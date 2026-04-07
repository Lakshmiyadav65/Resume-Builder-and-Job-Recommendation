const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const Candidate = require('../models/Candidate');
const RecruiterSession = require('../models/RecruiterSession');

// Configure multer for multiple file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});

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
      const msg = error.message || '';
      const isRetryable = msg.includes('429') || msg.includes('Too Many Requests') ||
        msg.includes('failed_generation') || msg.includes('Failed to generate');
      if (isRetryable) {
        if (i === maxRetries - 1) throw error;
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Retryable error (attempt ${i + 1}/${maxRetries}), retrying in ${delay}ms: ${msg.substring(0, 100)}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Extract text from PDF buffer
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Validate if the text is a resume
function validateResume(text) {
  if (!text || text.trim().length < 100) {
    return { valid: false, reason: 'Resume file appears to be empty or too short. Please upload a proper resume PDF.' };
  }

  const resumeKeywords = [
    'experience', 'education', 'skills', 'work', 'projects', 'university',
    'college', 'degree', 'bachelor', 'master', 'certification', 'certified',
    'employed', 'developed', 'managed', 'led', 'designed', 'implemented',
    'achieved', 'responsibilities', 'accomplishments', 'profile', 'summary',
    'objective', 'career', 'professional', 'intern', 'internship', 'volunteer',
    'award', 'achievement', 'technical', 'competencies', 'expertise'
  ];

  const jobPostingKeywords = [
    'we are looking', 'we are hiring', 'join our team', 'apply now',
    'job description', 'job requirements', 'required qualifications',
    'preferred qualifications', 'what we offer', 'benefits package',
    'equal opportunity employer', 'salary range', 'compensation package',
    'about the company', 'company culture', 'our mission', 'our vision',
    'company benefits', 'hiring for', 'positions available'
  ];

  const lowerText = text.toLowerCase();

  const jobPostingMatches = jobPostingKeywords.filter(keyword =>
    lowerText.includes(keyword)
  ).length;

  if (jobPostingMatches >= 2) {
    return {
      valid: false,
      reason: 'This appears to be a job posting, not a resume. Please upload actual candidate resume PDFs.'
    };
  }

  const resumeMatches = resumeKeywords.filter(keyword =>
    lowerText.includes(keyword)
  ).length;

  if (resumeMatches < 4) {
    return {
      valid: false,
      reason: 'This does not appear to be a valid resume. Please upload proper resumes with experience, education, and skills.'
    };
  }

  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);

  if (!hasEmail && !hasPhone) {
    return {
      valid: false,
      reason: 'Resume appears incomplete. Valid resumes should contain contact information (email or phone number).'
    };
  }

  return { valid: true };
}

// Validate if the text is a job description
function validateJobDescription(text) {
  if (!text || text.trim().length < 50) {
    return { valid: false, reason: 'Job description appears to be empty or too short. Please provide a proper job description (minimum 50 characters).' };
  }

  const trimmedText = text.trim();
  const lowerText = text.toLowerCase();

  const words = trimmedText.toLowerCase().split(/\s+/);
  if (words.length > 5) {
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    if (repetitionRatio < 0.3) {
      return {
        valid: false,
        reason: 'Job description appears to contain repetitive text. Please provide a genuine job description with requirements and responsibilities.'
      };
    }
  }

  if (lowerText.includes("doesn't appear to be") || lowerText.includes("please include job requirements")) {
    return {
      valid: false,
      reason: 'Please enter a real job description, not an error message or placeholder text.'
    };
  }

  const jdKeywords = [
    'responsibilities', 'requirements', 'qualifications', 'skills',
    'experience', 'role', 'position', 'job', 'candidate', 'must have',
    'should have', 'required', 'preferred', 'looking for', 'seeking',
    'duties', 'tasks', 'company', 'team', 'work', 'bachelor', 'degree',
    'years of experience', 'knowledge of', 'expertise in', 'proficient',
    'familiar with', 'ability to', 'strong', 'excellent', 'responsible for',
    'will be', 'about the role', 'what you', 'collaborate', 'develop'
  ];

  const jdMatches = jdKeywords.filter(keyword =>
    lowerText.includes(keyword)
  ).length;

  if (jdMatches < 4) {
    return {
      valid: false,
      reason: 'This does not appear to be a valid job description. A job description should include requirements, responsibilities, qualifications, or skills needed for the role.'
    };
  }

  const wordCount = trimmedText.split(/\s+/).length;
  if (wordCount < 30) {
    return {
      valid: false,
      reason: 'Job description is too brief. Please provide a detailed job description (minimum 30 words) with role requirements and responsibilities.'
    };
  }

  return { valid: true };
}

// Rank multiple resumes against a job description
router.post('/rank-resumes', upload.fields([
  { name: 'resumes', maxCount: 50 },
  { name: 'jobDescriptionFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { jobDescription, sessionId } = req.body;
    console.log(`Starting ranking for session: ${sessionId}`);
    const resumeFiles = req.files.resumes;

    if (!resumeFiles || resumeFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No resumes uploaded'
      });
    }

    let finalJobDescription = jobDescription;

    // If job description file is uploaded, extract text from it
    if (req.files.jobDescriptionFile && req.files.jobDescriptionFile[0]) {
      try {
        finalJobDescription = await extractTextFromPDF(req.files.jobDescriptionFile[0].buffer);
        if (!finalJobDescription || finalJobDescription.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Could not extract text from job description PDF'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Failed to process job description PDF'
        });
      }
    }

    if (!finalJobDescription || finalJobDescription.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Job description is required'
      });
    }

    // Validate job description
    const jdValidation = validateJobDescription(finalJobDescription);
    if (!jdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Job Description',
        message: jdValidation.reason
      });
    }

    // Extract text from all resumes
    const resumeTexts = await Promise.all(
      resumeFiles.map(async (file, index) => ({
        index: index + 1,
        fileName: file.originalname,
        text: await extractTextFromPDF(file.buffer)
      }))
    );

    // Validate all resumes
    const invalidResumes = [];
    for (const resume of resumeTexts) {
      const resumeValidation = validateResume(resume.text);
      if (!resumeValidation.valid) {
        invalidResumes.push({
          fileName: resume.fileName,
          reason: resumeValidation.reason
        });
      }
    }

    if (invalidResumes.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Resume Files',
        message: `${invalidResumes.length} file(s) are not valid resumes. Please upload proper candidate resume PDFs.`,
        invalidFiles: invalidResumes
      });
    }

    // Dynamically adjust resume text length based on number of resumes
    const resumeCount = resumeTexts.length;
    const maxCharsPerResume = resumeCount <= 2 ? 2000 : resumeCount <= 5 ? 1200 : 800;

    const prompt = `You are an expert AI recruiter. Rank these resumes against the job description.

Job Description:
${finalJobDescription.substring(0, 2000)}

Resumes:
${resumeTexts.map(r => `Resume ${r.index} (${r.fileName}):\n${r.text.substring(0, maxCharsPerResume)}\n---`).join('\n')}

RANKING RULES:
- Domain mismatch (e.g., Hardware resume for Consulting job): fitScore 15-35
- Different domain with transferable skills: fitScore 35-55
- Same domain, different level: fitScore 50-75
- Strong domain match: fitScore 70-95
- State domain mismatch clearly in justification

Return JSON only:
{
  "rankedCandidates": [
    {
      "rank": 1,
      "fileName": "resume.pdf",
      "name": "Candidate Name",
      "email": "candidate@email.com",
      "phone": "+1234567890",
      "fitScore": 85,
      "strengths": ["strength1", "strength2", "strength3"],
      "missingSkills": ["skill1", "skill2"],
      "justification": "Brief honest assessment of fit"
    }
  ]
}

IMPORTANT: Extract the candidate's actual email and phone from their resume text. If not found, use empty string.

Rank from highest to lowest fitScore. Be strict about domain alignment.`;

    // Dynamically set max_tokens based on resume count
    const maxTokens = Math.min(8000, 1500 + resumeCount * 800);

    // Call Groq API with retry logic
    const completion = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert resume ranker. Respond with valid JSON only. Be strict about domain matching."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: maxTokens
      });
    }, 5, 2000);

    const text = completion.choices[0].message.content;

    // Parse JSON response
    let analysisData;
    try {
      analysisData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', text);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: text
      });
    }

    // Save to MongoDB
    try {
      // Create or update recruiter session
      let recruiterSession = await RecruiterSession.findOne({ sessionId, userId: req.user._id });

      if (!recruiterSession) {
        recruiterSession = new RecruiterSession({
          userId: req.user._id,
          sessionId: sessionId,
          recruiterId: req.user._id.toString(),
          jobDescription: finalJobDescription,
          totalCandidates: resumeTexts.length,
          status: 'active',
        });
        await recruiterSession.save();
      } else {
        recruiterSession.totalCandidates = resumeTexts.length;
        await recruiterSession.updateActivity();
      }

      // Save each candidate to database
      if (analysisData.rankedCandidates && analysisData.rankedCandidates.length > 0) {
        // Delete existing candidates for this session (refresh)
        await Candidate.deleteMany({ sessionId, userId: req.user._id });

        // Save new candidates
        const candidateDocs = analysisData.rankedCandidates.map((candidate, index) => {
          const resumeObj = resumeTexts.find(r => r.fileName === candidate.fileName) || resumeTexts[index];
          const text = resumeObj?.text || '';

          // Regex fallback for email/phone extraction from resume text
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

          return {
            userId: req.user._id,
            recruiterId: req.user._id.toString(),
            sessionId: sessionId,
            jobDescription: finalJobDescription,
            fileName: candidate.fileName || resumeObj?.fileName || '',
            resumeText: text,
            candidateName: candidate.name || `Candidate ${candidate.rank}`,
            email: candidate.email || (emailMatch ? emailMatch[0] : ''),
            phone: candidate.phone || (phoneMatch ? phoneMatch[0] : ''),
            rank: candidate.rank,
            fitScore: candidate.fitScore,
            strengths: candidate.strengths || [],
            missingSkills: candidate.missingSkills || [],
            justification: candidate.justification || '',
            status: 'pending',
          };
        });

        await Candidate.insertMany(candidateDocs);
        console.log(`Saved ${candidateDocs.length} candidates to database`);
      }

    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Continue even if DB save fails - still return results to user
    }

    res.json({
      success: true,
      sessionId: sessionId,
      data: analysisData
    });

  } catch (error) {
    console.error('Ranking error:', error);

    // Log error to a file for debugging
    try {
      const fs = require('fs');
      const logMsg = `\n[${new Date().toISOString()}] Ranking Error: ${error.message}\nStack: ${error.stack}\n`;
      fs.appendFileSync('ranking-errors.log', logMsg);
    } catch (e) {
      console.error('Failed to write to log file', e);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rank resumes',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Generate assignment ideas based on job description
router.post('/generate-assignments', async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        error: 'Job description is required'
      });
    }

    const prompt = `You are an expert recruiter and talent assessment specialist. Based on the following job description, generate 3-5 practical assignment ideas that can help assess candidates' skills.

Job Description:
${jobDescription}

Generate assignment ideas that:
1. Test real-world problem-solving skills mentioned in the JD
2. Are achievable within realistic timeframes (1-4 hours)
3. Cover both technical and analytical abilities
4. Are practical and relevant to the actual job role
5. Have clear evaluation criteria

Return output strictly in JSON format:
{
  "assignments": [
    {
      "title": "Assignment Title",
      "description": "Detailed description of what candidates need to do (2-3 sentences)",
      "evaluationCriteria": "What you'll evaluate (e.g., code quality, analytical thinking, clarity)",
      "estimatedTime": "X hours"
    }
  ]
}

Generate 3-5 varied assignments covering different skill aspects from the JD.`;

    // Call Groq API with retry logic
    const completion = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating candidate assessment assignments. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 1500
      });
    });

    const text = completion.choices[0].message.content;

    // Parse JSON response
    let assignmentData;
    try {
      assignmentData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: text
      });
    }

    res.json({
      success: true,
      data: assignmentData
    });

  } catch (error) {
    console.error('Assignment generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate assignments'
    });
  }
});

// Generate interview questions from job description
router.post('/generate-interview-questions', async (req, res) => {
  try {
    const { jobDescription, candidateResume, count } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        error: 'Job description is required'
      });
    }

    const numQuestions = Math.min(count || 10, 15);

    const prompt = `You are a senior technical interviewer. Based on the following job description, generate exactly ${numQuestions} interview questions.

Job Description:
${jobDescription.substring(0, 3000)}

${candidateResume ? `Candidate Resume:\n${candidateResume.substring(0, 2000)}` : ''}

RULES:
1. Generate exactly ${numQuestions} questions
2. Questions must be directly based on skills, responsibilities, and requirements mentioned in the JD
3. Mix question types:
   - 3-4 Technical/skill-based questions (test specific skills from the JD)
   - 2-3 Behavioral/situational questions (test soft skills from the JD)
   - 2-3 Problem-solving/scenario questions (test real-world application)
   - 1-2 Experience/project questions (test depth of knowledge)
4. Each question should have a short professional followup response
5. Questions should progressively increase in difficulty
6. Be specific to the JD — don't ask generic questions

Return JSON only:
{
  "questions": [
    {
      "q": "The interview question here",
      "followup": "A brief professional acknowledgment/transition (1 sentence)"
    }
  ]
}`;

    const completion = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer. Generate targeted interview questions based on job descriptions. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000
      });
    });

    const text = completion.choices[0].message.content;
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response'
      });
    }

    res.json({
      success: true,
      data: {
        questions: data.questions || []
      }
    });

  } catch (error) {
    console.error('Interview question generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate interview questions'
    });
  }
});

// Generate AI interview report from Q&A transcript
router.post('/generate-interview-report', async (req, res) => {
  try {
    const { jobDescription, questions, answers, candidateName } = req.body;

    if (!questions || !answers || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Questions and answers are required' });
    }

    const transcript = questions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || 'No answer provided'}`).join('\n\n');

    const prompt = `You are a senior hiring manager analyzing an AI-conducted interview. Generate a comprehensive, realistic interview evaluation report.

Job Description:
${(jobDescription || 'Software Engineering Position').substring(0, 2000)}

Interview Transcript:
${transcript.substring(0, 4000)}

Candidate: ${candidateName || 'Candidate'}

Analyze the candidate's responses and generate a detailed JSON report:

{
  "overallScore": <number 0-100, be strict and realistic>,
  "recommendation": "<Highly Recommended / Recommended / Consider with Reservations / Not Recommended>",
  "competencies": {
    "communicationClarity": { "score": <1-10>, "detail": "<1 sentence>" },
    "technicalAccuracy": { "score": <1-10>, "detail": "<1 sentence>" },
    "problemSolving": { "score": <1-10>, "detail": "<1 sentence>" },
    "answerDepth": { "score": <1-10>, "detail": "<1 sentence>" },
    "confidenceLevel": { "score": <1-10>, "detail": "<1 sentence>" },
    "culturalFit": { "score": <1-10>, "detail": "<1 sentence>" }
  },
  "sentiment": {
    "positive": <percentage number>,
    "neutral": <percentage number>,
    "negative": <percentage number>,
    "summary": "<2 sentences about candidate tone and attitude>"
  },
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>", "<specific strength 4>"],
  "weaknesses": ["<specific area for improvement 1>", "<specific area for improvement 2>", "<specific area for improvement 3>"],
  "questionAnalysis": [
    {
      "question": "<shortened question>",
      "rating": "<Excellent/Good/Satisfactory/Needs Improvement>",
      "keyInsight": "<1 sentence about what this answer revealed>"
    }
  ],
  "hiringDecision": {
    "verdict": "<PASS / HOLD / FAIL>",
    "confidence": <percentage 0-100>,
    "nextStep": "<specific recommended next action>",
    "reasoning": "<2-3 sentences explaining the decision>"
  },
  "candidateProfile": {
    "estimatedExperience": "<e.g., 2-3 years>",
    "topSkills": ["skill1", "skill2", "skill3"],
    "role_fit": "<Strong Fit / Moderate Fit / Weak Fit>"
  }
}

Be honest, specific, and base everything on actual answers given. If answers were short or vague, score accordingly.`;

    const completion = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are an expert hiring evaluator. Generate detailed, honest interview evaluation reports in valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 3000
      });
    });

    const data = JSON.parse(completion.choices[0].message.content);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Interview report generation error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate report' });
  }
});

module.exports = router;

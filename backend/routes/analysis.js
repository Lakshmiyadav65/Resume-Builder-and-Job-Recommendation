const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const Analysis = require('../models/Analysis');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
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

// Extract text from PDF
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (error) {
    throw new Error('Failed to extract text from PDF');
  }
}

// Validate if the text is a resume
function validateResume(text) {
  if (!text || text.trim().length < 100) {
    return { valid: false, reason: 'Resume file appears to be empty or too short. Please upload a proper resume PDF.' };
  }

  // Resume indicators (keywords that typically appear in resumes)
  const resumeKeywords = [
    'experience', 'education', 'skills', 'work', 'projects', 'university',
    'college', 'degree', 'bachelor', 'master', 'certification', 'certified',
    'employed', 'developed', 'managed', 'led', 'designed', 'implemented',
    'achieved', 'responsibilities', 'accomplishments', 'profile', 'summary',
    'objective', 'career', 'professional', 'intern', 'internship', 'volunteer',
    'award', 'achievement', 'technical', 'competencies', 'expertise'
  ];

  // Job posting indicators (should NOT be in resume)
  const jobPostingKeywords = [
    'we are looking', 'we are hiring', 'join our team', 'apply now',
    'job description', 'job requirements', 'required qualifications',
    'preferred qualifications', 'what we offer', 'benefits package',
    'equal opportunity employer', 'salary range', 'compensation package',
    'about the company', 'company culture', 'our mission', 'our vision',
    'company benefits', 'hiring for', 'positions available'
  ];

  const lowerText = text.toLowerCase();

  // Check for job posting indicators (red flag)
  const jobPostingMatches = jobPostingKeywords.filter(keyword =>
    lowerText.includes(keyword)
  ).length;

  if (jobPostingMatches >= 2) {
    return {
      valid: false,
      reason: 'This appears to be a job posting, not a resume. Please upload your actual resume PDF.'
    };
  }

  // Check for resume indicators
  const resumeMatches = resumeKeywords.filter(keyword =>
    lowerText.includes(keyword)
  ).length;

  // Need at least 4 resume keywords to be considered valid
  if (resumeMatches < 4) {
    return {
      valid: false,
      reason: 'This does not appear to be a valid resume. Please upload a proper resume with your experience, education, and skills.'
    };
  }

  // Check for personal information patterns
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);

  // A resume should have at least an email or phone
  if (!hasEmail && !hasPhone) {
    return {
      valid: false,
      reason: 'Resume appears incomplete. A valid resume should contain contact information (email or phone number).'
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

  // Check for repeated patterns (like "ai ai ai" or "test test test")
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

  // Check if it's just the error message being pasted back
  if (lowerText.includes("doesn't appear to be") || lowerText.includes("please include job requirements")) {
    return {
      valid: false,
      reason: 'Please enter a real job description, not an error message or placeholder text.'
    };
  }

  // Job description indicators
  const jdKeywords = [
    'responsibilities', 'requirements', 'qualifications', 'skills',
    'experience', 'role', 'position', 'job', 'candidate', 'must have',
    'should have', 'required', 'preferred', 'looking for', 'seeking',
    'duties', 'tasks', 'company', 'team', 'work', 'bachelor', 'degree',
    'years of experience', 'knowledge of', 'expertise in', 'proficient',
    'familiar with', 'ability to', 'strong', 'excellent', 'responsible for',
    'will be', 'about the role', 'what you', 'collaborate', 'develop'
  ];

  // Check for job description indicators
  const jdMatches = jdKeywords.filter(keyword =>
    lowerText.includes(keyword)
  ).length;

  // Need at least 4 JD keywords for better accuracy
  if (jdMatches < 4) {
    return {
      valid: false,
      reason: 'This does not appear to be a valid job description. A job description should include requirements, responsibilities, qualifications, or skills needed for the role.'
    };
  }

  // Check word count - job descriptions should have substance
  const wordCount = trimmedText.split(/\s+/).length;
  if (wordCount < 30) {
    return {
      valid: false,
      reason: 'Job description is too brief. Please provide a detailed job description (minimum 30 words) with role requirements and responsibilities.'
    };
  }

  return { valid: true };
}

// Analyze resume with OpenAI
async function analyzeResumeWithGroq(resumeText, jobDescription) {
  const prompt = `
You are an expert AI resume evaluator with deep knowledge of industry-specific skills and job requirements.

Resume Text:
${resumeText.substring(0, 4000)}

Job Description:
${jobDescription.substring(0, 4000)}

**CRITICAL INSTRUCTIONS:**

1. **First, validate if this is a resume:**
   - If the text is NOT a resume (e.g., job posting, blank doc, random text), respond ONLY with:
   {
     "resume_valid": false,
     "reason": "Brief explanation why it's not a resume"
   }

2. **DOMAIN MATCH ANALYSIS - BE STRICT:**
   - **Identify the JOB DOMAIN** from job description:
     * Software/Tech: software engineer, developer, programmer, data scientist, ML engineer, web developer, DevOps
     * Hardware/Electronics: VLSI, embedded systems, circuit design, PCB, FPGA, Verilog, VHDL, electronics engineer
     * Consulting/Business: consultant, business analyst, management consulting, supply chain, operations, strategy
     * Finance: accountant, financial analyst, investment banking, auditor, finance manager
     * Marketing/Sales: marketing manager, sales executive, digital marketing, brand manager
     * Data/Analytics: data analyst, business intelligence, data engineer, analytics
     * Design: UI/UX designer, graphic designer, product designer
     * HR/People: HR manager, recruiter, talent acquisition, people operations
   
   - **Identify the RESUME DOMAIN** from resume content:
     * Look at education major, job titles, projects, skills listed
     * Determine primary field/industry
   
   - **CHECK DOMAIN ALIGNMENT:**
     * If domains are **COMPLETELY DIFFERENT** (e.g., Hardware resume for Software job, or Engineering resume for Marketing job):
       - overall_score should be **15-35** (very low)
       - skill_score should be **10-30** (minimal overlap)
       - semantic_score should be **10-35** (context mismatch)
       - In feedback, **CLEARLY STATE** domain mismatch as the PRIMARY weakness
       - Example: "This resume is focused on hardware/electronics engineering (Verilog, VHDL, circuit design), while the job requires supply chain consulting and business operations skills. This is a fundamental domain mismatch."
   
   - **If domains have some overlap** (e.g., Data Science resume for ML Engineer job):
     - Score based on actual skill matches (40-70 range)
   
   - **If domains align well**:
     - Score based on experience level and skill depth (50-95 range)

3. **SCORING RULES - BE REALISTIC AND STRICT:**

   **overall_score (0-100):**
   - 0-20: Wrong field entirely (hardware for software, marketing for engineering)
   - 21-40: Different domain but some transferable skills
   - 41-60: Same domain but junior/different specialization
   - 61-80: Good match with some gaps
   - 81-100: Excellent match, strong candidate
   
   **skill_score (0-100):**
   - Count ACTUAL matching skills between resume and JD
   - Don't give credit for unrelated skills (hardware skills don't help for consulting jobs)
   - Be strict: Only 10-20% for cross-domain matches
   
   **semantic_score (0-100):**
   - Measure contextual/domain alignment
   - Low score (10-30) if candidate's industry experience doesn't match job industry
   - High score (70-90) if candidate has worked in same/similar industry

4. **Technical Skills - BE DOMAIN-AWARE:**
   - Extract technical skills EXPLICITLY mentioned in the job description
   - **INFER industry-standard skills** based on the job title and role
   - Examples:
     * "Supply Chain Consultant" → SAP, Excel, Data Analytics, ERP, Logistics, Procurement
     * "Software Engineer" → Git, APIs, Database, Testing, Cloud platforms, Programming languages
     * "Data Analyst" → SQL, Excel, Power BI, Python, Tableau, Data Visualization
     * "Hardware Engineer" → Verilog, VHDL, Cadence, PCB Design, Circuit Design, FPGA
   - **DON'T** count Verilog/VHDL as valuable for a consulting job
   - **DON'T** count Excel pivot tables as sufficient for a software engineering job

5. **Recommendations - BE HONEST:**
   - Write 6-8 personalized, actionable recommendations
   - If domain mismatch exists, **state it clearly** as the top recommendation
   - Example: "This role requires supply chain and business consulting expertise, but your background is in electronics hardware engineering. Consider targeting roles in electronics/VLSI companies or gaining relevant business analysis experience first."
   - Be specific about skill gaps
   - Use natural, conversational language (like a career coach talking)

6. **Qualitative Feedback - STRUCTURED AND HONEST:**
   - Format with clear sections and bullet points
   - **If domain mismatch exists, make it the FIRST weakness**
   - Be specific, actionable, and honest
   - 3-4 points per section
   
   **STRENGTHS** - What's working well:
   - Specific skills or experiences that match the role (if any)
   - Impressive certifications or education highlights
   - Quantifiable achievements or career progression
   - Strong technical or soft skills demonstrated (that are relevant)
   
   **WEAKNESSES/GAPS** - Areas needing attention:
   - **PRIMARY: Domain/field mismatch if applicable** (e.g., "This resume is focused on electronics hardware engineering while the job requires supply chain consulting expertise - a fundamental career field mismatch")
   - Missing critical skills for the role
   - Lack of quantifiable metrics or achievements
   - Generic descriptions without impact demonstration
   - Skills mentioned but not demonstrated with examples
   
   **OPPORTUNITIES** - How to enhance the resume:
   - Specific ways to showcase experience with tools/technologies
   - How to tailor content to emphasize relevant skills
   - Suggestions for restructuring or highlighting key areas
   - Ways to make achievements more impactful
   
   **RECOMMENDATIONS** - Priority action items:
   - Top 3-4 immediate changes to make
   - Specific keywords or phrases to add
   - Concrete examples of how to improve descriptions
   - ATS optimization strategies

**OUTPUT FORMAT (JSON only, no markdown):**

{
  "resume_valid": true,
  "overall_score": number (0-100),
  "semantic_score": number (0-100),
  "skill_score": number (0-100),

  "feedback": "STRENGTHS\\n- Point 1\\n- Point 2\\n\\nWEAKNESSES/GAPS\\n- PRIMARY domain mismatch if applicable\\n- Other points\\n\\nOPPORTUNITIES\\n- Point 1\\n\\nRECOMMENDATIONS\\n- Point 1",

  "soft_skills_required": ["Communication", "Teamwork", "Problem-solving", etc.],
  "soft_skills_present": ["Leadership", "Collaboration", etc.],
  "technical_skills_required": ["SQL", "Python", "Excel", etc. - domain-appropriate skills],
  "technical_skills_present": ["Java", "React", "MongoDB", etc. - skills from resume],

  "recommendations": [
      "If domain mismatch: State it clearly as #1",
      "Personalized recommendation 2 with specific examples",
      "Personalized recommendation 3 with concrete actions",
      "Personalized recommendation 4 addressing gaps",
      "Personalized recommendation 5 about achievements",
      "Personalized recommendation 6 about keywords"
  ]
}
`;

  try {
    const completion = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", // Latest Groq Llama 3.3 model
        messages: [
          {
            role: "system",
            content: "You are an expert resume analyzer. Always respond with valid JSON only, no markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2500
      });
    });

    const responseText = completion.choices[0].message.content;
    const analysis = JSON.parse(responseText);

    return analysis;
  } catch (error) {
    console.error('Groq API Error:', error);
    throw new Error(`Failed to analyze resume: ${error.message}`);
  }
}

// POST /api/analysis/analyze
router.post('/analyze', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'jobDescriptionFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { jobDescription, sessionId } = req.body;

    if (!req.files || !req.files.resume || !req.files.resume[0]) {
      return res.status(400).json({ error: 'Resume file is required' });
    }

    let finalJobDescription = jobDescription;

    // If job description file is uploaded, extract text from it
    if (req.files.jobDescriptionFile && req.files.jobDescriptionFile[0]) {
      try {
        finalJobDescription = await extractTextFromPDF(req.files.jobDescriptionFile[0].buffer);
        if (!finalJobDescription || finalJobDescription.trim().length === 0) {
          return res.status(400).json({ error: 'Could not extract text from job description PDF' });
        }
      } catch (error) {
        return res.status(400).json({ error: 'Failed to process job description PDF' });
      }
    }

    if (!finalJobDescription || finalJobDescription.trim().length === 0) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Extract text from resume PDF
    const resumeText = await extractTextFromPDF(req.files.resume[0].buffer);

    if (!resumeText) {
      return res.status(400).json({ error: 'Could not extract text from resume' });
    }

    // Validate that it's actually a resume
    const resumeValidation = validateResume(resumeText);
    if (!resumeValidation.valid) {
      return res.status(400).json({
        error: 'Invalid Resume',
        message: resumeValidation.reason
      });
    }

    // Validate that job description is valid
    const jdValidation = validateJobDescription(finalJobDescription);
    if (!jdValidation.valid) {
      return res.status(400).json({
        error: 'Invalid Job Description',
        message: jdValidation.reason
      });
    }

    // Analyze with OpenAI
    const analysis = await analyzeResumeWithGroq(resumeText, finalJobDescription);

    // Check if resume is valid
    if (analysis.resume_valid === false) {
      return res.status(400).json({
        error: 'Invalid resume',
        reason: analysis.reason
      });
    }

    // Use findOneAndUpdate with upsert to avoid duplicate key errors
    const analysisDoc = await Analysis.findOneAndUpdate(
      { sessionId: sessionId || `session_${Date.now()}` },
      {
        resumeText,
        jobDescription: finalJobDescription,
        overallScore: analysis.overall_score || 0,
        semanticScore: analysis.semantic_score || 0,
        skillScore: analysis.skill_score || 0,
        feedback: analysis.feedback || '',
        softSkillsRequired: analysis.soft_skills_required || [],
        softSkillsPresent: analysis.soft_skills_present || [],
        technicalSkillsRequired: analysis.technical_skills_required || [],
        technicalSkillsPresent: analysis.technical_skills_present || [],
        recommendations: analysis.recommendations || [],
      },
      {
        upsert: true, // Create if doesn't exist, update if exists
        new: true,    // Return the updated document
        setDefaultsOnInsert: true
      }
    );

    res.json({
      success: true,
      sessionId: analysisDoc.sessionId,
      data: {
        overallScore: analysisDoc.overallScore,
        semanticScore: analysisDoc.semanticScore,
        skillScore: analysisDoc.skillScore,
        feedback: analysisDoc.feedback,
        softSkillsRequired: analysisDoc.softSkillsRequired,
        softSkillsPresent: analysisDoc.softSkillsPresent,
        technicalSkillsRequired: analysisDoc.technicalSkillsRequired,
        technicalSkillsPresent: analysisDoc.technicalSkillsPresent,
        recommendations: analysisDoc.recommendations,
      },
    });
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

// GET /api/analysis/:sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ sessionId: req.params.sessionId });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      success: true,
      data: {
        overallScore: analysis.overallScore,
        semanticScore: analysis.semanticScore,
        skillScore: analysis.skillScore,
        feedback: analysis.feedback,
        softSkillsRequired: analysis.softSkillsRequired,
        softSkillsPresent: analysis.softSkillsPresent,
        technicalSkillsRequired: analysis.technicalSkillsRequired,
        technicalSkillsPresent: analysis.technicalSkillsPresent,
        recommendations: analysis.recommendations,
      },
    });
  } catch (error) {
    console.error('Get Analysis Error:', error);
    res.status(500).json({ error: 'Failed to retrieve analysis' });
  }
});

module.exports = router;

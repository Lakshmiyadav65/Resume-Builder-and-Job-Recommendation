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
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        if (i === maxRetries - 1) throw error;
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Rate limit hit, retrying in ${delay}ms...`);
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

    // Prepare prompt for Gemini
    const prompt = `You are an expert AI recruiter with deep knowledge of industry-specific skills and job requirements.

Job Description:
${finalJobDescription}

    Resumes:
    ${resumeTexts.map(r => `
    Resume ${r.index} (${r.fileName}):
    ${r.text.substring(0, 2000)}
    ---
    `).join('\n')}

**INTELLIGENT RANKING INSTRUCTIONS:**

1. **DOMAIN MATCH ANALYSIS - BE CRITICAL:**
   - **Identify the JOB DOMAIN** from job description:
     * Software/Tech: software engineer, developer, data scientist, ML, web dev, DevOps
     * Hardware/Electronics: VLSI, embedded, circuit design, PCB, FPGA, Verilog, VHDL
     * Consulting/Business: consultant, business analyst, management, supply chain, operations
     * Finance: accountant, financial analyst, investment, auditor
     * Marketing/Sales: marketing, sales, digital marketing, brand
     * Data/Analytics: data analyst, BI, data engineer, analytics
   
   - **For EACH resume, identify its DOMAIN**:
     * Look at education, job titles, projects, primary skills
   
   - **SCORING RULES:**
     * **Domain mismatch** (e.g., Hardware resume for Consulting job): fitScore 15-35 maximum
     * **Different domain with transferable skills**: fitScore 35-55
     * **Same domain, different level**: fitScore 50-75
     * **Strong domain match**: fitScore 70-95
   
   - **In justification, STATE domain mismatch clearly** if it exists

2. **Identify the job title/role** from the job description and infer industry-standard skills

3. **Infer required skills** based on the role:
   - Examples:
     * "Supply Chain Consultant" → SAP, Excel, Data Analytics, ERP, Procurement, Logistics
     * "Software Engineer" → Git, APIs, Database, Testing, Cloud, Programming languages
     * "Data Analyst" → SQL, Excel, Power BI, Python, Tableau
     * "Hardware Engineer" → Verilog, VHDL, Cadence, PCB, Circuit Design, FPGA

4. **Evaluate each resume STRICTLY on:**
   - **PRIMARY: Domain/field alignment** (hardware vs software vs business vs marketing)
   - Skills match (only count relevant domain skills)
   - Experience relevance and depth
   - Education alignment with job field
   - Quantifiable achievements

5. **fitScore - BE REALISTIC:**
   - 15-35: Wrong domain/field (hardware for software, engineering for marketing)
   - 35-55: Different domain but some transferable skills
   - 55-75: Same domain, different specialization or junior
   - 75-90: Strong match with minor gaps
   - 90-100: Excellent match, ideal candidate

6. **Strengths - BE HONEST:**
   - Call out exact matching skills (only if domain-relevant)
   - If domain mismatch, acknowledge limited alignment
   - Mention relevant certifications or education
   - Highlight quantifiable achievements

7. **Missing Skills - BE DOMAIN-AWARE:**
   - List critical skills for the ACTUAL job domain
   - If candidate is from different domain, list fundamental domain skills missing
   - Example: For consulting job, if hardware resume: "Supply chain management, business analysis, ERP systems, consulting experience"

8. **Justification - BE FRANK:**
   - If domain mismatch, state it clearly: "Background is in electronics hardware engineering while role requires supply chain consulting expertise"
   - Be specific about why score is low/high
   - Provide honest career guidance

**OUTPUT FORMAT (JSON only, no markdown):**

{
  "rankedCandidates": [
    {
      "rank": 1,
      "fileName": "resume_name.pdf",
      "name": "Candidate Name (extract from resume, or 'Candidate X')",
      "fitScore": number (15-100, BE STRICT about domain mismatch),
      "strengths": [
        "Specific strength 1 (only if domain-relevant)",
        "Specific strength 2 with achievements",
        "Specific strength 3 with relevant skills"
      ],
      "missingSkills": ["Critical domain skill 1", "Critical domain skill 2", "Fundamental field expertise"],
      "justification": "HONEST assessment: If domain mismatch, state it clearly. Example: 'Candidate has strong electronics hardware background (Verilog, VHDL) but lacks supply chain consulting and business operations expertise required for this role.' Or if good match: 'Strong alignment with 5+ years in supply chain management and proven ERP implementation experience.'"
    }
  ]
}

**CRITICAL:** Rank from highest to lowest fitScore. BE STRICT about domain alignment. A hardware engineer should NOT score 55% for a consulting job - score should be 20-30% maximum.`;

    // Call Groq API with retry logic
    const completion = await retryWithBackoff(async () => {
      return await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert resume ranker. Always respond with valid JSON only, no markdown formatting. Be strict about domain matching."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000
      });
    }, 5, 2000); // Increased retries and initial delay

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
      let recruiterSession = await RecruiterSession.findOne({ sessionId });

      if (!recruiterSession) {
        recruiterSession = new RecruiterSession({
          sessionId: sessionId,
          recruiterId: sessionId, // Using sessionId as recruiterId for now
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
        await Candidate.deleteMany({ sessionId });

        // Save new candidates
        const candidateDocs = analysisData.rankedCandidates.map((candidate, index) => ({
          recruiterId: sessionId,
          sessionId: sessionId,
          jobDescription: finalJobDescription,
          fileName: candidate.fileName || resumeTexts[index].fileName,
          resumeText: resumeTexts.find(r => r.fileName === candidate.fileName)?.text || '',
          candidateName: candidate.name || `Candidate ${candidate.rank}`,
          rank: candidate.rank,
          fitScore: candidate.fitScore,
          strengths: candidate.strengths || [],
          missingSkills: candidate.missingSkills || [],
          justification: candidate.justification || '',
          status: 'pending',
        }));

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

module.exports = router;

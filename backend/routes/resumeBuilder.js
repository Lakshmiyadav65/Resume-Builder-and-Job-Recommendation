const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const Resume = require('../models/Resume');
const PDFDocument = require('pdfkit');

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

// POST /api/resume-builder/save - Save or update resume
router.post('/save', async (req, res) => {
    try {
        const { sessionId, resumeData } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required'
            });
        }

        // Find and update or create new
        const resume = await Resume.findOneAndUpdate(
            { sessionId },
            { ...resumeData, sessionId },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Resume saved successfully',
            resumeId: resume._id,
        });
    } catch (error) {
        console.error('Save Resume Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to save resume'
        });
    }
});

// GET /api/resume-builder/:sessionId - Get resume by session
router.get('/:sessionId', async (req, res) => {
    try {
        const resume = await Resume.findOne({ sessionId: req.params.sessionId });

        if (!resume) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found'
            });
        }

        res.json({
            success: true,
            data: resume,
        });
    } catch (error) {
        console.error('Get Resume Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve resume'
        });
    }
});

// POST /api/resume-builder/enhance-bullet - AI-enhance a bullet point
router.post('/enhance-bullet', async (req, res) => {
    try {
        const { text, role, context } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }

        const prompt = `You are an expert resume writer. Enhance the following responsibility/achievement into a professional, impactful bullet point.

Original text: "${text}"
${role ? `Role: ${role}` : ''}
${context ? `Context: ${context}` : ''}

Rules:
1. Start with a strong action verb
2. Add quantifiable metrics if possible (use realistic estimates like "5+ team members" or "20% improvement")
3. Show impact and results
4. Keep it to 1-2 lines maximum
5. Make it ATS-friendly (avoid special characters)
6. Be specific and professional

Return ONLY the enhanced bullet point, nothing else.`;

        const completion = await retryWithBackoff(async () => {
            return await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert resume writer who creates compelling, ATS-optimized bullet points. Return only the enhanced text, no explanations."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            });
        });

        const enhancedText = completion.choices[0].message.content.trim();

        res.json({
            success: true,
            original: text,
            enhanced: enhancedText,
        });
    } catch (error) {
        console.error('Enhance Bullet Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to enhance text'
        });
    }
});

// POST /api/resume-builder/generate-summary - AI-generate career summary
router.post('/generate-summary', async (req, res) => {
    try {
        const { targetRole, education, experience, skills } = req.body;

        if (!targetRole) {
            return res.status(400).json({
                success: false,
                error: 'Target role is required'
            });
        }

        const prompt = `Generate a professional 2-3 sentence career objective/summary for a resume.

Target Role: ${targetRole}
Education: ${education || 'Not provided'}
Years of Experience: ${experience || 'Entry level'}
Key Skills: ${skills ? skills.join(', ') : 'Not provided'}

Requirements:
1. Professional and confident tone
2. Highlight relevant skills and strengths
3. Show enthusiasm for the target role
4. 2-3 sentences maximum
5. First person perspective (implied, don't use "I")

Return ONLY the summary, no title or extra text.`;

        const completion = await retryWithBackoff(async () => {
            return await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert resume writer who creates compelling career summaries. Return only the summary text."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 200
            });
        });

        const summary = completion.choices[0].message.content.trim();

        res.json({
            success: true,
            summary: summary,
        });
    } catch (error) {
        console.error('Generate Summary Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate summary'
        });
    }
});

// POST /api/resume-builder/suggest-skills - Suggest skills based on role
router.post('/suggest-skills', async (req, res) => {
    try {
        const { targetRole } = req.body;

        if (!targetRole) {
            return res.status(400).json({
                success: false,
                error: 'Target role is required'
            });
        }

        const prompt = `List the top 10-12 most important technical skills for a ${targetRole} role.

Return as a JSON array of strings, no explanations.
Example format: ["Python", "SQL", "Git", ...]

Focus on industry-standard, in-demand skills.`;

        const completion = await retryWithBackoff(async () => {
            return await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are a hiring expert. Return only valid JSON array of skill names."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 300
            });
        });

        const responseText = completion.choices[0].message.content;
        const parsed = JSON.parse(responseText);

        // Handle various response formats
        const skills = parsed.skills || parsed.technical_skills || parsed;

        res.json({
            success: true,
            skills: Array.isArray(skills) ? skills : Object.values(skills),
        });
    } catch (error) {
        console.error('Suggest Skills Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to suggest skills'
        });
    }
});

// POST /api/resume-builder/generate-pdf - Generate PDF from resume data
router.post('/generate-pdf', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required'
            });
        }

        const resume = await Resume.findOne({ sessionId });

        if (!resume) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found'
            });
        }

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${resume.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf"`);
            res.send(pdfBuffer);
        });

        // Header - Name and Contact
        doc.fontSize(24).font('Helvetica-Bold').text(resume.personalInfo.fullName, { align: 'center' });
        doc.moveDown(0.3);

        const contact = [
            resume.personalInfo.email,
            resume.personalInfo.phone,
            resume.personalInfo.location
        ].filter(Boolean).join(' | ');

        doc.fontSize(10).font('Helvetica').text(contact, { align: 'center' });

        const links = [
            resume.personalInfo.linkedin,
            resume.personalInfo.github,
            resume.personalInfo.portfolio
        ].filter(Boolean).join(' | ');

        if (links) {
            doc.fontSize(9).fillColor('blue').text(links, { align: 'center', link: resume.personalInfo.linkedin });
        }

        doc.fillColor('black');
        doc.moveDown(1);

        // Objective/Summary
        if (resume.objective?.summary) {
            doc.fontSize(12).font('Helvetica-Bold').text('PROFESSIONAL SUMMARY');
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').text(resume.objective.summary, { align: 'justify' });
            doc.moveDown(1);
        }

        // Education
        if (resume.education && resume.education.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('EDUCATION');
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            resume.education.forEach(edu => {
                doc.fontSize(11).font('Helvetica-Bold').text(edu.university);
                doc.fontSize(10).font('Helvetica').text(`${edu.degree}${edu.major ? ` in ${edu.major}` : ''} | ${edu.graduationYear || 'Present'}`, { continued: true });
                if (edu.gpa) {
                    doc.text(` | GPA: ${edu.gpa}`, { align: 'left' });
                } else {
                    doc.text('');
                }
                if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
                    doc.fontSize(9).text(`Relevant Coursework: ${edu.relevantCoursework.join(', ')}`);
                }
                doc.moveDown(0.5);
            });
            doc.moveDown(0.5);
        }

        // Experience
        if (resume.experience && resume.experience.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('PROFESSIONAL EXPERIENCE');
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            resume.experience.forEach(exp => {
                doc.fontSize(11).font('Helvetica-Bold').text(exp.company);
                doc.fontSize(10).font('Helvetica-Oblique').text(`${exp.role} | ${exp.duration || exp.startDate + ' - ' + (exp.current ? 'Present' : exp.endDate)}`);
                doc.moveDown(0.3);

                if (exp.responsibilities && exp.responsibilities.length > 0) {
                    exp.responsibilities.forEach(resp => {
                        doc.fontSize(10).font('Helvetica').text(`• ${resp}`, { indent: 10 });
                    });
                }
                doc.moveDown(0.7);
            });
            doc.moveDown(0.3);
        }

        // Projects
        if (resume.projects && resume.projects.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('PROJECTS');
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            resume.projects.forEach(proj => {
                doc.fontSize(11).font('Helvetica-Bold').text(proj.name);
                if (proj.technologies && proj.technologies.length > 0) {
                    doc.fontSize(9).font('Helvetica-Oblique').text(`Technologies: ${proj.technologies.join(', ')}`);
                }
                doc.moveDown(0.3);

                if (proj.description) {
                    doc.fontSize(10).font('Helvetica').text(proj.description);
                }

                if (proj.highlights && proj.highlights.length > 0) {
                    proj.highlights.forEach(highlight => {
                        doc.fontSize(10).font('Helvetica').text(`• ${highlight}`, { indent: 10 });
                    });
                }

                if (proj.githubLink || proj.liveLink) {
                    const projLinks = [
                        proj.githubLink ? `GitHub: ${proj.githubLink}` : null,
                        proj.liveLink ? `Live: ${proj.liveLink}` : null
                    ].filter(Boolean).join(' | ');
                    doc.fontSize(9).fillColor('blue').text(projLinks);
                    doc.fillColor('black');
                }
                doc.moveDown(0.7);
            });
            doc.moveDown(0.3);
        }

        // Skills
        if (resume.skills && (resume.skills.technical.length > 0 || resume.skills.soft.length > 0)) {
            doc.fontSize(12).font('Helvetica-Bold').text('SKILLS');
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            if (resume.skills.technical && resume.skills.technical.length > 0) {
                doc.fontSize(10).font('Helvetica-Bold').text('Technical: ', { continued: true });
                doc.font('Helvetica').text(resume.skills.technical.join(', '));
                doc.moveDown(0.3);
            }

            if (resume.skills.soft && resume.skills.soft.length > 0) {
                doc.fontSize(10).font('Helvetica-Bold').text('Soft Skills: ', { continued: true });
                doc.font('Helvetica').text(resume.skills.soft.join(', '));
                doc.moveDown(0.3);
            }

            if (resume.skills.languages && resume.skills.languages.length > 0) {
                doc.fontSize(10).font('Helvetica-Bold').text('Languages: ', { continued: true });
                doc.font('Helvetica').text(resume.skills.languages.join(', '));
            }
            doc.moveDown(0.5);
        }

        // Certifications
        if (resume.certifications && resume.certifications.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('CERTIFICATIONS');
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            resume.certifications.forEach(cert => {
                doc.fontSize(10).font('Helvetica-Bold').text(cert.name, { continued: true });
                doc.font('Helvetica').text(` - ${cert.issuer}`, { continued: true });
                if (cert.date) {
                    doc.text(` | ${cert.date}`);
                } else {
                    doc.text('');
                }
            });
        }

        doc.end();

    } catch (error) {
        console.error('Generate PDF Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate PDF'
        });
    }
});

// PUT /api/resume-builder/update-status - Update resume status
router.put('/update-status', async (req, res) => {
    try {
        const { sessionId, status } = req.body;

        const resume = await Resume.findOneAndUpdate(
            { sessionId },
            { status },
            { new: true }
        );

        if (!resume) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
        });
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update status'
        });
    }
});

module.exports = router;

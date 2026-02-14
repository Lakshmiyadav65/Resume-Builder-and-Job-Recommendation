import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FcCheckmark, FcNext, FcPrevious, FcDocument } from 'react-icons/fc';
import { useApp } from '../context/AppContext';
import { saveResume, enhanceBullet, generateSummary, suggestSkills, generatePDF } from '../services/api';
import './ResumeBuilder.css';

const ResumeBuilder = () => {
    const navigate = useNavigate();
    const { sessionId, setResumeText, setAnalysisData } = useApp();

    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhancingIndex, setEnhancingIndex] = useState(null);

    const [resumeData, setResumeData] = useState({
        personalInfo: {
            fullName: '',
            email: '',
            phone: '',
            linkedin: '',
            github: '',
            portfolio: '',
            location: '',
        },
        objective: {
            targetRole: '',
            summary: '',
        },
        education: [{
            university: '',
            degree: '',
            major: '',
            graduationYear: '',
            gpa: '',
            relevantCoursework: [],
        }],
        experience: [{
            company: '',
            role: '',
            duration: '',
            startDate: '',
            endDate: '',
            current: false,
            responsibilities: [''],
        }],
        skills: {
            technical: [],
            soft: [],
            languages: [],
        },
        projects: [{
            name: '',
            description: '',
            technologies: [],
            githubLink: '',
            liveLink: '',
            highlights: [''],
        }],
        certifications: [],
        selectedTemplate: 'modern',
    });

    const steps = [
        { number: 1, title: 'Personal Info', icon: '👤' },
        { number: 2, title: 'Objective', icon: '🎯' },
        { number: 3, title: 'Education', icon: '🎓' },
        { number: 4, title: 'Experience', icon: '💼' },
        { number: 5, title: 'Projects', icon: '🚀' },
        { number: 6, title: 'Skills', icon: '⚡' },
        { number: 7, title: 'Template', icon: '🎨' },
        { number: 8, title: 'Review', icon: '✅' },
    ];

    useEffect(() => {
        // Auto-save on step change
        if (currentStep > 1) {
            handleAutoSave();
        }
    }, [currentStep]);

    const handleAutoSave = async () => {
        try {
            await saveResume({ sessionId, resumeData });
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    };

    const handleInputChange = (section, field, value, index = null) => {
        setResumeData(prev => {
            if (index !== null) {
                // Handle array updates
                const newArray = [...prev[section]];
                newArray[index] = { ...newArray[index], [field]: value };
                return { ...prev, [section]: newArray };
            } else if (section === 'personalInfo' || section === 'objective' || section === 'skills') {
                return {
                    ...prev,
                    [section]: { ...prev[section], [field]: value }
                };
            } else {
                return { ...prev, [section]: value };
            }
        });
    };

    const addArrayItem = (section, defaultItem) => {
        setResumeData(prev => ({
            ...prev,
            [section]: [...prev[section], defaultItem]
        }));
    };

    const removeArrayItem = (section, index) => {
        setResumeData(prev => ({
            ...prev,
            [section]: prev[section].filter((_, i) => i !== index)
        }));
    };

    const handleEnhanceBullet = async (text, section, expIndex, bulletIndex) => {
        if (!text.trim()) {
            alert('Please enter some text first before enhancing');
            return;
        }

        console.log('🤖 Enhancing bullet point...');
        console.log('Text:', text);
        console.log('Section:', section, 'Index:', expIndex, bulletIndex);

        setIsEnhancing(true);
        setEnhancingIndex(`${section}-${expIndex}-${bulletIndex}`);

        try {
            const role = section === 'experience'
                ? resumeData.experience[expIndex]?.role
                : resumeData.projects[expIndex]?.name;

            const requestData = { text, role: role || '' };
            console.log('Request Data:', requestData);

            const response = await enhanceBullet(requestData);
            console.log('API Response:', response);

            if (response.success && response.enhanced) {
                setResumeData(prev => {
                    const newData = { ...prev };
                    if (section === 'experience') {
                        newData.experience[expIndex].responsibilities[bulletIndex] = response.enhanced;
                    } else if (section === 'projects') {
                        newData.projects[expIndex].highlights[bulletIndex] = response.enhanced;
                    }
                    return newData;
                });
                console.log('✅ Bullet enhanced successfully');
            } else {
                console.error('❌ API returned unsuccessful response:', response);
                alert('Failed to enhance text. Please try again.');
            }
        } catch (error) {
            console.error('❌ Enhancement error:', error);
            console.error('Error details:', error.response?.data || error.message);
            alert(`AI enhancement failed: ${error.response?.data?.error || error.message || 'Unknown error'}. Please check your internet connection and try again.`);
        } finally {
            setIsEnhancing(false);
            setEnhancingIndex(null);
        }
    };

    const handleGenerateSummary = async () => {
        if (!resumeData.objective.targetRole) {
            alert('Please enter your target role first');
            return;
        }

        console.log('🤖 Generating AI Summary...');
        console.log('Target Role:', resumeData.objective.targetRole);

        setIsEnhancing(true);
        try {
            const requestData = {
                targetRole: resumeData.objective.targetRole,
                education: resumeData.education[0]?.degree || '',
                experience: resumeData.experience.length > 0 ? `${resumeData.experience.length} roles` : 'Entry level',
                skills: resumeData.skills.technical || [],
            };

            console.log('Request Data:', requestData);

            const response = await generateSummary(requestData);

            console.log('API Response:', response);

            if (response.success && response.summary) {
                handleInputChange('objective', 'summary', response.summary);
                console.log('✅ Summary generated successfully');
            } else {
                console.error('❌ API returned unsuccessful response:', response);
                alert('Failed to generate summary. Please try again.');
            }
        } catch (error) {
            console.error('❌ Summary generation error:', error);
            console.error('Error details:', error.response?.data || error.message);
            alert(`AI summary generation failed: ${error.response?.data?.error || error.message || 'Unknown error'}. Please check your internet connection and try again.`);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleSuggestSkills = async () => {
        if (!resumeData.objective.targetRole) {
            alert('Please enter your target role first');
            return;
        }

        console.log('🤖 Suggesting skills for role:', resumeData.objective.targetRole);

        setIsEnhancing(true);
        try {
            const requestData = { targetRole: resumeData.objective.targetRole };
            console.log('Request Data:', requestData);

            const response = await suggestSkills(requestData);
            console.log('API Response:', response);

            if (response.success && response.skills) {
                handleInputChange('skills', 'technical', response.skills);
                console.log('✅ Skills suggested successfully');
            } else {
                console.error('❌ API returned unsuccessful response:', response);
                alert('Failed to suggest skills. Please try again.');
            }
        } catch (error) {
            console.error('❌ Skill suggestion error:', error);
            console.error('Error details:', error.response?.data || error.message);
            alert(`AI skill suggestion failed: ${error.response?.data?.error || error.message || 'Unknown error'}. Please check your internet connection and try again.`);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsSaving(true);
        try {
            const response = await generatePDF({ sessionId });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleAnalyzeResume = async () => {
        setIsSaving(true);
        try {
            // Save the resume first
            await saveResume({ sessionId, resumeData });

            // Navigate to dashboard with resume uploaded flag
            navigate('/dashboard', { state: { fromBuilder: true } });
        } catch (error) {
            console.error('Failed to save resume:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="step-content">
                        <h2>Personal Information</h2>
                        <div className="form-grid">
                            <input
                                type="text"
                                placeholder="Full Name *"
                                value={resumeData.personalInfo.fullName}
                                onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email *"
                                value={resumeData.personalInfo.email}
                                onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                                required
                            />
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={resumeData.personalInfo.phone}
                                onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Location (City, State)"
                                value={resumeData.personalInfo.location}
                                onChange={(e) => handleInputChange('personalInfo', 'location', e.target.value)}
                            />
                            <input
                                type="url"
                                placeholder="LinkedIn Profile URL"
                                value={resumeData.personalInfo.linkedin}
                                onChange={(e) => handleInputChange('personalInfo', 'linkedin', e.target.value)}
                            />
                            <input
                                type="url"
                                placeholder="GitHub Profile URL"
                                value={resumeData.personalInfo.github}
                                onChange={(e) => handleInputChange('personalInfo', 'github', e.target.value)}
                            />
                            <input
                                type="url"
                                placeholder="Portfolio Website"
                                value={resumeData.personalInfo.portfolio}
                                onChange={(e) => handleInputChange('personalInfo', 'portfolio', e.target.value)}
                                className="full-width"
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="step-content">
                        <h2>Career Objective</h2>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="Target Job Role (e.g., Software Engineer, Data Analyst) *"
                                value={resumeData.objective.targetRole}
                                onChange={(e) => handleInputChange('objective', 'targetRole', e.target.value)}
                                required
                            />
                            <div className="textarea-with-ai">
                                <textarea
                                    placeholder="Professional Summary (2-3 sentences about your career goals and strengths)"
                                    value={resumeData.objective.summary}
                                    onChange={(e) => handleInputChange('objective', 'summary', e.target.value)}
                                    rows="4"
                                />
                                <motion.button
                                    className="ai-enhance-btn"
                                    onClick={handleGenerateSummary}
                                    disabled={!resumeData.objective.targetRole || isEnhancing}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    ✨ {isEnhancing ? 'Generating...' : 'AI Generate Summary'}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="step-content">
                        <h2>Education</h2>
                        {resumeData.education.map((edu, index) => (
                            <div key={index} className="array-item">
                                <div className="form-grid">
                                    <input
                                        type="text"
                                        placeholder="University/College Name *"
                                        value={edu.university}
                                        onChange={(e) => handleInputChange('education', 'university', e.target.value, index)}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Degree (e.g., B.Tech, M.Sc.) *"
                                        value={edu.degree}
                                        onChange={(e) => handleInputChange('education', 'degree', e.target.value, index)}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Major/Specialization"
                                        value={edu.major}
                                        onChange={(e) => handleInputChange('education', 'major', e.target.value, index)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Graduation Year"
                                        value={edu.graduationYear}
                                        onChange={(e) => handleInputChange('education', 'graduationYear', e.target.value, index)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="GPA (optional)"
                                        value={edu.gpa}
                                        onChange={(e) => handleInputChange('education', 'gpa', e.target.value, index)}
                                    />
                                </div>
                                {index > 0 && (
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeArrayItem('education', index)}
                                    >
                                        Remove Education
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            className="add-btn"
                            onClick={() => addArrayItem('education', {
                                university: '', degree: '', major: '', graduationYear: '', gpa: '', relevantCoursework: []
                            })}
                        >
                            + Add Another Education
                        </button>
                    </div>
                );

            case 4:
                return (
                    <div className="step-content">
                        <h2>Work Experience</h2>
                        {resumeData.experience.map((exp, expIndex) => (
                            <div key={expIndex} className="array-item">
                                <div className="form-grid">
                                    <input
                                        type="text"
                                        placeholder="Company Name *"
                                        value={exp.company}
                                        onChange={(e) => handleInputChange('experience', 'company', e.target.value, expIndex)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Job Title *"
                                        value={exp.role}
                                        onChange={(e) => handleInputChange('experience', 'role', e.target.value, expIndex)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Duration (e.g., Jan 2020 - Dec 2021)"
                                        value={exp.duration}
                                        onChange={(e) => handleInputChange('experience', 'duration', e.target.value, expIndex)}
                                        className="full-width"
                                    />
                                </div>

                                <h4>Responsibilities & Achievements</h4>
                                {exp.responsibilities.map((resp, respIndex) => (
                                    <div key={respIndex} className="bullet-input-group">
                                        <textarea
                                            placeholder="Describe your responsibility or achievement..."
                                            value={resp}
                                            onChange={(e) => {
                                                const newResp = [...exp.responsibilities];
                                                newResp[respIndex] = e.target.value;
                                                handleInputChange('experience', 'responsibilities', newResp, expIndex);
                                            }}
                                            rows="2"
                                        />
                                        <div className="bullet-actions">
                                            <motion.button
                                                className="ai-mini-btn"
                                                onClick={() => handleEnhanceBullet(resp, 'experience', expIndex, respIndex)}
                                                disabled={isEnhancing || !resp.trim()}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                ✨ {isEnhancing && enhancingIndex === `experience-${expIndex}-${respIndex}` ? 'Enhancing...' : 'Enhance'}
                                            </motion.button>
                                            {respIndex > 0 && (
                                                <button
                                                    className="remove-mini-btn"
                                                    onClick={() => {
                                                        const newResp = exp.responsibilities.filter((_, i) => i !== respIndex);
                                                        handleInputChange('experience', 'responsibilities', newResp, expIndex);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    className="add-mini-btn"
                                    onClick={() => {
                                        const newResp = [...exp.responsibilities, ''];
                                        handleInputChange('experience', 'responsibilities', newResp, expIndex);
                                    }}
                                >
                                    + Add Responsibility
                                </button>

                                {expIndex > 0 && (
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeArrayItem('experience', expIndex)}
                                    >
                                        Remove Experience
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            className="add-btn"
                            onClick={() => addArrayItem('experience', {
                                company: '', role: '', duration: '', responsibilities: ['']
                            })}
                        >
                            + Add Another Experience
                        </button>
                    </div>
                );

            case 5:
                return (
                    <div className="step-content">
                        <h2>Projects</h2>
                        {resumeData.projects.map((proj, projIndex) => (
                            <div key={projIndex} className="array-item">
                                <div className="form-grid">
                                    <input
                                        type="text"
                                        placeholder="Project Name *"
                                        value={proj.name}
                                        onChange={(e) => handleInputChange('projects', 'name', e.target.value, projIndex)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Technologies (comma-separated)"
                                        value={proj.technologies.join(', ')}
                                        onChange={(e) => handleInputChange('projects', 'technologies', e.target.value.split(',').map(t => t.trim()), projIndex)}
                                    />
                                    <input
                                        type="url"
                                        placeholder="GitHub Link"
                                        value={proj.githubLink}
                                        onChange={(e) => handleInputChange('projects', 'githubLink', e.target.value, projIndex)}
                                    />
                                    <input
                                        type="url"
                                        placeholder="Live Demo Link"
                                        value={proj.liveLink}
                                        onChange={(e) => handleInputChange('projects', 'liveLink', e.target.value, projIndex)}
                                    />
                                </div>
                                <textarea
                                    placeholder="Project Description"
                                    value={proj.description}
                                    onChange={(e) => handleInputChange('projects', 'description', e.target.value, projIndex)}
                                    rows="2"
                                    className="full-width"
                                />

                                <h4>Key Highlights</h4>
                                {proj.highlights.map((highlight, hlIndex) => (
                                    <div key={hlIndex} className="bullet-input-group">
                                        <textarea
                                            placeholder="Describe a key achievement or feature..."
                                            value={highlight}
                                            onChange={(e) => {
                                                const newHighlights = [...proj.highlights];
                                                newHighlights[hlIndex] = e.target.value;
                                                handleInputChange('projects', 'highlights', newHighlights, projIndex);
                                            }}
                                            rows="2"
                                        />
                                        <div className="bullet-actions">
                                            <motion.button
                                                className="ai-mini-btn"
                                                onClick={() => handleEnhanceBullet(highlight, 'projects', projIndex, hlIndex)}
                                                disabled={isEnhancing || !highlight.trim()}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                ✨ {isEnhancing && enhancingIndex === `projects-${projIndex}-${hlIndex}` ? 'Enhancing...' : 'Enhance'}
                                            </motion.button>
                                            {hlIndex > 0 && (
                                                <button
                                                    className="remove-mini-btn"
                                                    onClick={() => {
                                                        const newHighlights = proj.highlights.filter((_, i) => i !== hlIndex);
                                                        handleInputChange('projects', 'highlights', newHighlights, projIndex);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    className="add-mini-btn"
                                    onClick={() => {
                                        const newHighlights = [...proj.highlights, ''];
                                        handleInputChange('projects', 'highlights', newHighlights, projIndex);
                                    }}
                                >
                                    + Add Highlight
                                </button>

                                {projIndex > 0 && (
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeArrayItem('projects', projIndex)}
                                    >
                                        Remove Project
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            className="add-btn"
                            onClick={() => addArrayItem('projects', {
                                name: '', description: '', technologies: [], githubLink: '', liveLink: '', highlights: ['']
                            })}
                        >
                            + Add Another Project
                        </button>
                    </div>
                );

            case 6:
                return (
                    <div className="step-content">
                        <h2>Skills</h2>
                        <div className="form-group">
                            <label>Technical Skills</label>
                            <textarea
                                placeholder="Enter skills separated by commas (e.g., Python, React, SQL, AWS)"
                                value={resumeData.skills.technical.join(', ')}
                                onChange={(e) => handleInputChange('skills', 'technical', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                rows="3"
                            />
                            <motion.button
                                className="ai-enhance-btn"
                                onClick={handleSuggestSkills}
                                disabled={!resumeData.objective.targetRole || isEnhancing}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                ✨ {isEnhancing ? 'Suggesting...' : 'AI Suggest Skills for ' + (resumeData.objective.targetRole || 'Role')}
                            </motion.button>
                        </div>

                        <div className="form-group">
                            <label>Soft Skills</label>
                            <textarea
                                placeholder="Enter soft skills separated by commas (e.g., Leadership, Communication, Problem Solving)"
                                value={resumeData.skills.soft.join(', ')}
                                onChange={(e) => handleInputChange('skills', 'soft', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                rows="2"
                            />
                        </div>

                        <div className="form-group">
                            <label>Languages</label>
                            <textarea
                                placeholder="Languages you speak (e.g., English, Spanish, Mandarin)"
                                value={resumeData.skills.languages.join(', ')}
                                onChange={(e) => handleInputChange('skills', 'languages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                rows="2"
                            />

                        </div>
                    </div>
                );

            case 7:
                return (
                    <div className="step-content">
                        <h2>Choose Your Template</h2>
                        <p style={{ textAlign: 'center', color: '#999', marginBottom: '30px' }}>
                            Select a professional template that best matches your career style
                        </p>
                        <div className="template-grid">
                            <motion.div
                                className={`template-card ${resumeData.selectedTemplate === 'modern' ? 'selected' : ''}`}
                                onClick={() => handleInputChange('selectedTemplate', null, 'modern')}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="template-preview">
                                    <div className="template-icon">📄</div>
                                    <h3>Modern Professional</h3>
                                </div>
                                <div className="template-features">
                                    <p className="template-description">Clean, ATS-friendly design with bold section headers</p>
                                    <ul>
                                        <li>✓ Best for Tech & Corporate</li>
                                        <li>✓ Excellent ATS compatibility</li>
                                        <li>✓ Easy to scan</li>
                                    </ul>
                                </div>
                                {resumeData.selectedTemplate === 'modern' && (
                                    <div className="selected-badge">✓ Selected</div>
                                )}
                            </motion.div>

                            <motion.div
                                className={`template-card ${resumeData.selectedTemplate === 'classic' ? 'selected' : ''}`}
                                onClick={() => handleInputChange('selectedTemplate', null, 'classic')}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="template-preview">
                                    <div className="template-icon">📋</div>
                                    <h3>Classic Executive</h3>
                                </div>
                                <div className="template-features">
                                    <p className="template-description">Traditional format with serif fonts and formal layout</p>
                                    <ul>
                                        <li>✓ Best for Finance & Legal</li>
                                        <li>✓ Professional appearance</li>
                                        <li>✓ Conservative design</li>
                                    </ul>
                                </div>
                                {resumeData.selectedTemplate === 'classic' && (
                                    <div className="selected-badge">✓ Selected</div>
                                )}
                            </motion.div>

                            <motion.div
                                className={`template-card ${resumeData.selectedTemplate === 'minimal' ? 'selected' : ''}`}
                                onClick={() => handleInputChange('selectedTemplate', null, 'minimal')}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="template-preview">
                                    <div className="template-icon">🎯</div>
                                    <h3>Minimal Clean</h3>
                                </div>
                                <div className="template-features">
                                    <p className="template-description">Minimalist design focusing on content over decoration</p>
                                    <ul>
                                        <li>✓ Best for Design & Creative</li>
                                        <li>✓ Maximum readability</li>
                                        <li>✓ Contemporary style</li>
                                    </ul>
                                </div>
                                {resumeData.selectedTemplate === 'minimal' && (
                                    <div className="selected-badge">✓ Selected</div>
                                )}
                            </motion.div>

                            <motion.div
                                className={`template-card ${resumeData.selectedTemplate === 'creative' ? 'selected' : ''}`}
                                onClick={() => handleInputChange('selectedTemplate', null, 'creative')}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="template-preview">
                                    <div className="template-icon">🎨</div>
                                    <h3>Creative Bold</h3>
                                </div>
                                <div className="template-features">
                                    <p className="template-description">Distinctive design with visual elements and color accents</p>
                                    <ul>
                                        <li>✓ Best for Marketing & Media</li>
                                        <li>✓ Eye-catching layout</li>
                                        <li>✓ Personality showcase</li>
                                    </ul>
                                </div>
                                {resumeData.selectedTemplate === 'creative' && (
                                    <div className="selected-badge">✓ Selected</div>
                                )}
                            </motion.div>

                            <motion.div
                                className={`template-card ${resumeData.selectedTemplate === 'technical' ? 'selected' : ''}`}
                                onClick={() => handleInputChange('selectedTemplate', null, 'technical')}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="template-preview">
                                    <div className="template-icon">💻</div>
                                    <h3>Technical Developer</h3>
                                </div>
                                <div className="template-features">
                                    <p className="template-description">Code-inspired layout optimized for technical roles</p>
                                    <ul>
                                        <li>✓ Best for Software Engineers</li>
                                        <li>✓ Skills-focused sections</li>
                                        <li>✓ GitHub/Portfolio highlights</li>
                                    </ul>
                                </div>
                                {resumeData.selectedTemplate === 'technical' && (
                                    <div className="selected-badge">✓ Selected</div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                );

            case 8:
                return (
                    <div className="step-content review-step">
                        <h2>Review & Finalize</h2>
                        <div className="review-summary">
                            <div className="review-card">
                                <FcCheckmark className="review-icon" />
                                <h3>{resumeData.personalInfo.fullName || 'Your Name'}</h3>
                                <p>{resumeData.objective.targetRole || 'Target Role'}</p>
                                <p className="review-stats">
                                    📚 {resumeData.education.length} Education{resumeData.education.length !== 1 ? 's' : ''} •
                                    💼 {resumeData.experience.length} Experience{resumeData.experience.length !== 1 ? 's' : ''} •
                                    🚀 {resumeData.projects.length} Project{resumeData.projects.length !== 1 ? 's' : ''}
                                </p>
                                <p className="review-stats">
                                    ⚡ {resumeData.skills.technical.length} Technical Skills
                                </p>
                            </div>

                            <div className="review-actions">
                                <motion.button
                                    className="download-pdf-btn"
                                    onClick={handleDownloadPDF}
                                    disabled={isSaving}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FcDocument style={{ fontSize: '1.5rem', marginRight: '8px' }} />
                                    {isSaving ? 'Generating PDF...' : 'Download Resume PDF'}
                                </motion.button>

                                <motion.button
                                    className="analyze-resume-btn"
                                    onClick={handleAnalyzeResume}
                                    disabled={isSaving}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    🎯 Analyze Against Job Description
                                </motion.button>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="resume-builder-container">
            {/* Progress Stepper */}
            <div className="stepper">
                {steps.map((step) => (
                    <div
                        key={step.number}
                        className={`step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
                        onClick={() => setCurrentStep(step.number)}
                    >
                        <div className="step-circle">
                            {currentStep > step.number ? <FcCheckmark /> : <span>{step.icon}</span>}
                        </div>
                        <p className="step-title">{step.title}</p>
                    </div>
                ))}
            </div>

            {/* Form Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    className="builder-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {renderStepContent()}
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="navigation-buttons">
                <motion.button
                    className="nav-btn prev-btn"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FcPrevious /> Previous
                </motion.button>

                {currentStep < steps.length && (
                    <motion.button
                        className="nav-btn next-btn"
                        onClick={handleNext}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Next <FcNext />
                    </motion.button>
                )}
            </div>
        </div>
    );
};

export default ResumeBuilder;

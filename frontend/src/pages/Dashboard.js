import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FcUpload, FcDocument, FcVoicePresentation, FcSearch, FcCalendar, FcGraduationCap, FcBusinessman, FcRedo, FcBarChart } from 'react-icons/fc';
import { FaChevronDown } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import { analyzeResume } from '../services/api';
import Sidebar from '../components/Sidebar';
import CircularGauge from '../components/CircularGauge';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { sessionId, setSessionId, analysisData, setAnalysisData, setUserRole, setJobDescription, resetSession } = useApp();

  const [resumeFile, setResumeFile] = useState(null);
  const [jobDesc, setJobDesc] = useState('');
  const [jobDescFile, setJobDescFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check if there's existing analysis data on mount
  useEffect(() => {
    if (analysisData && sessionId) {
      setAnalysisComplete(true);
    }
  }, [analysisData, sessionId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setError('');
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setError('');
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleJobDescFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setJobDescFile(file);
      setJobDesc(''); // Clear textarea when file is uploaded
      setError('');
    } else {
      setError('Please upload a PDF file for job description');
    }
  };

  const removeJobDescFile = () => {
    setJobDescFile(null);
  };

  const validateJobDescription = (text) => {
    const trimmedText = text.trim();

    // Check minimum length (at least 50 characters)
    if (trimmedText.length < 50) {
      return { valid: false, message: 'Job description is too short. Please provide a detailed job description (minimum 50 characters).' };
    }

    // Check for repeated patterns (like "ai ai ai" or "test test test")
    const words = trimmedText.toLowerCase().split(/\s+/);
    if (words.length > 5) {
      const uniqueWords = new Set(words);
      const repetitionRatio = uniqueWords.size / words.length;
      if (repetitionRatio < 0.3) {
        return { valid: false, message: 'Job description appears to contain repetitive text. Please provide a genuine job description with requirements and responsibilities.' };
      }
    }

    // Check if it's an error message being pasted back
    const lowerText = trimmedText.toLowerCase();
    if (lowerText.includes("doesn't appear to be") || lowerText.includes("please include job requirements") || lowerText.includes("error message")) {
      return { valid: false, message: 'Please enter a real job description, not an error message or placeholder text.' };
    }

    // Check if it's just repeated characters or gibberish
    const uniqueChars = new Set(trimmedText.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size < 10) {
      return { valid: false, message: 'Job description appears to be invalid. Please enter a meaningful job description.' };
    }

    // Check for job-related keywords
    const jobKeywords = [
      'experience', 'skill', 'skills', 'responsibility', 'responsibilities',
      'qualification', 'qualifications', 'requirement', 'requirements',
      'role', 'position', 'job', 'work', 'candidate', 'team',
      'develop', 'manage', 'lead', 'support', 'design', 'implement',
      'years', 'degree', 'bachelor', 'master', 'education',
      'knowledge', 'ability', 'proficient', 'expertise', 'duties',
      'must have', 'should have', 'looking for', 'seeking'
    ];

    const keywordMatches = jobKeywords.filter(keyword => lowerText.includes(keyword)).length;

    if (keywordMatches < 4) {
      return { valid: false, message: 'This doesn\'t appear to be a valid job description. A job description should include requirements, responsibilities, qualifications, or skills needed for the role.' };
    }

    // Check word count (at least 30 words for substance)
    const wordCount = trimmedText.split(/\s+/).length;
    if (wordCount < 30) {
      return { valid: false, message: 'Job description is too brief. Please provide a detailed description (minimum 30 words) with role requirements and responsibilities.' };
    }

    return { valid: true, message: '' };
  };

  const handleAnalyze = async () => {
    if (!resumeFile || (!jobDesc.trim() && !jobDescFile)) {
      setError('Please upload a resume and provide a job description (paste or upload)');
      return;
    }

    // Validate job description only if it's text (not file)
    if (jobDesc.trim() && !jobDescFile) {
      const validation = validateJobDescription(jobDesc);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // Generate a new unique session ID for each analysis
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const formData = new FormData();
      formData.append('resume', resumeFile);

      // Add job description (either text or file)
      if (jobDescFile) {
        formData.append('jobDescriptionFile', jobDescFile);
      } else {
        formData.append('jobDescription', jobDesc);
      }

      formData.append('sessionId', newSessionId);

      const response = await analyzeResume(formData);

      if (response.success) {
        setSessionId(response.sessionId);
        setAnalysisData(response.data);
        setJobDescription(jobDesc || `Job Description from ${jobDescFile.name}`);
        setAnalysisComplete(true);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      // Enhanced error handling for validation errors
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.reason ||
        err.response?.data?.error ||
        'Analysis failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    // Reset all state including session ID and localStorage
    setResumeFile(null);
    setJobDesc('');
    setJobDescFile(null);
    setAnalysisComplete(false);
    setError('');
    resetSession(); // This will clear all context data and localStorage
  };

  const handleModeSwitch = (mode) => {
    setUserRole(mode);
    setShowModeDropdown(false);
    if (mode === 'recruiter') {
      navigate('/recruiter-dashboard');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowModeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getScoreColor = (score) => {
    if (score <= 40) return '#ef4444';
    if (score <= 70) return '#f59e0b';
    return '#10b981';
  };

  const renderFormattedFeedback = (feedback) => {
    if (!feedback) return 'No feedback available';

    // Updated section headers to match new format
    const sections = ['STRENGTHS', 'WEAKNESSES/GAPS', 'OPPORTUNITIES', 'RECOMMENDATIONS'];
    let formattedContent = [];
    let currentSection = null;
    let currentContent = [];

    const lines = feedback.split('\n');

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // Check if line is a section header (all caps)
      const isSection = sections.some(section => trimmedLine === section);

      if (isSection) {
        // Save previous section if exists
        if (currentSection) {
          formattedContent.push({
            title: currentSection,
            content: currentContent.join('\n')
          });
        }
        currentSection = trimmedLine;
        currentContent = [];
      } else if (trimmedLine) {
        // Remove leading "- " if present (we'll add custom bullets via CSS)
        const cleanedLine = trimmedLine.startsWith('- ') ? trimmedLine.substring(2) : trimmedLine;
        currentContent.push(cleanedLine);
      }
    });

    // Add the last section
    if (currentSection) {
      formattedContent.push({
        title: currentSection,
        content: currentContent.join('\n')
      });
    }

    // If no sections found, return original text
    if (formattedContent.length === 0) {
      return <div>{feedback}</div>;
    }

    return (
      <div>
        {formattedContent.map((section, index) => (
          <div key={index} className="feedback-section-item">
            <h4 className="feedback-section-title">{section.title}</h4>
            <div className="feedback-section-content">
              {section.content.split('\n').map((line, i) => (
                line.trim() && <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Sidebar />

      <div className="dashboard-main">
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-left">
            <div className="mode-selector" ref={dropdownRef}>
              <button
                className="mode-badge clickable"
                onClick={() => setShowModeDropdown(!showModeDropdown)}
              >
                <FcGraduationCap style={{ fontSize: '1.3rem', marginRight: '8px' }} />
                Student Mode
                <FaChevronDown className={`dropdown-icon ${showModeDropdown ? 'open' : ''}`} />
              </button>

              <AnimatePresence>
                {showModeDropdown && (
                  <motion.div
                    className="mode-dropdown"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="mode-option active"
                      onClick={() => handleModeSwitch('student')}
                    >
                      <FcGraduationCap className="mode-icon" />
                      <div className="mode-text">
                        <span className="mode-title">Student Mode</span>
                        <span className="mode-desc">Analyze your resume & prepare</span>
                      </div>
                    </div>
                    <div
                      className="mode-option"
                      onClick={() => handleModeSwitch('recruiter')}
                    >
                      <FcBusinessman className="mode-icon" />
                      <div className="mode-text">
                        <span className="mode-title">Recruiter Mode</span>
                        <span className="mode-desc">Rank resumes & evaluate candidates</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="header-right">
            <motion.button
              className="share-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Share
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          className="dashboard-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="section-title">AI Powered Resume Analysis</h2>

          {!analysisComplete ? (
            <div className="upload-section">
              <motion.div
                className="choice-container"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h3 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.5rem' }}>
                  Choose Your Starting Point
                </h3>
                <div className="choice-cards">
                  <motion.div
                    className="choice-card"
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => navigate('/resume-builder')}
                  >
                    <div className="choice-icon">✨</div>
                    <h4>Build from Scratch</h4>
                    <p>Create a professional resume with our AI-powered builder</p>
                    <ul className="choice-features">
                      <li>✓ Step-by-step guidance</li>
                      <li>✓ AI content enhancement</li>
                      <li>✓ Professional templates</li>
                    </ul>
                  </motion.div>

                  <motion.div
                    className="choice-card"
                    whileHover={{ scale: 1.03, y: -5 }}
                  >
                    <div className="choice-icon">📄</div>
                    <h4>Upload Existing Resume</h4>
                    <p>Analyze and improve your current resume</p>
                    <div className="upload-inner">
                      <div
                        className={`dropzone ${isDragging ? 'dragging' : ''} ${resumeFile ? 'has-file' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input').click()}
                      >
                        <input
                          id="file-input"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                          disabled={analysisComplete}
                        />
                        <FcUpload className="upload-icon-small" style={{ fontSize: '2.5rem' }} />
                        {resumeFile ? (
                          <>
                            <p className="upload-text success">✓ {resumeFile.name}</p>
                            <p className="upload-hint">Click to change file</p>
                          </>
                        ) : (
                          <>
                            <p className="upload-text-small">Drag and drop or click</p>
                            <p className="upload-hint">PDF only, max 20MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                className="job-desc-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="job-desc-header">
                  <h3>Paste the Job Description Here</h3>
                  <div className="job-desc-actions">
                    <input
                      id="jd-file-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleJobDescFileChange}
                      style={{ display: 'none' }}
                      disabled={analysisComplete}
                    />
                    <motion.button
                      className="upload-jd-button"
                      onClick={() => document.getElementById('jd-file-upload').click()}
                      disabled={analysisComplete}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Upload job description PDF"
                    >
                      <FcUpload /> Upload PDF
                    </motion.button>
                  </div>
                </div>

                {jobDescFile ? (
                  <div className="jd-file-display">
                    <div className="jd-file-info">
                      <FcDocument className="jd-file-icon" style={{ fontSize: '2rem' }} />
                      <div className="jd-file-details">
                        <p className="jd-file-name">{jobDescFile.name}</p>
                        <p className="jd-file-size">{(jobDescFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <motion.button
                      className="jd-remove-button"
                      onClick={removeJobDescFile}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      disabled={analysisComplete}
                    >
                      ×
                    </motion.button>
                  </div>
                ) : (
                  <textarea
                    className="job-desc-textarea"
                    placeholder="Enter the job description..."
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    disabled={analysisComplete}
                  />
                )}
              </motion.div>

              {error && (
                <motion.div
                  className="error-message"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <div className="action-buttons">
                <motion.button
                  className="analyze-button"
                  onClick={handleAnalyze}
                  disabled={loading || analysisComplete}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FcBarChart style={{ marginRight: '8px' }} /> Start Analysis
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                className="results-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="results-header">
                  <h2><FcBarChart style={{ marginRight: '10px', fontSize: '1.8rem' }} />Match Scores</h2>
                  <motion.button
                    className="new-analysis-button"
                    onClick={handleNewAnalysis}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FcRedo style={{ marginRight: '8px' }} /> New Analysis
                  </motion.button>
                </div>

                <div className="gauges-container">
                  <CircularGauge
                    label="Overall Match"
                    value={analysisData?.overallScore || 0}
                    color={getScoreColor(analysisData?.overallScore || 0)}
                  />
                  <CircularGauge
                    label="Skill Match"
                    value={analysisData?.skillScore || 0}
                    color={getScoreColor(analysisData?.skillScore || 0)}
                  />
                </div>

                <div className="feedback-section">
                  <h3><FcDocument style={{ marginRight: '10px', fontSize: '1.5rem' }} />Qualitative Feedback</h3>
                  <div className="feedback-content">
                    {renderFormattedFeedback(analysisData?.feedback)}
                  </div>
                </div>

                <div className="navigation-cards">
                  <motion.div
                    className="nav-card"
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => navigate('/chat')}
                  >
                    <FcVoicePresentation className="nav-icon" style={{ fontSize: '3rem' }} />
                    <h4>Chat with Resume</h4>
                    <p>Ask questions about your resume</p>
                  </motion.div>

                  <motion.div
                    className="nav-card"
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => navigate('/deep-dive')}
                  >
                    <FcSearch className="nav-icon" style={{ fontSize: '3rem' }} />
                    <h4>Deep Dive</h4>
                    <p>Detailed skills gap analysis</p>
                  </motion.div>

                  <motion.div
                    className="nav-card"
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => navigate('/preparation')}
                  >
                    <FcCalendar className="nav-icon" style={{ fontSize: '3rem' }} />
                    <h4>Preparation Plan</h4>
                    <p>Get personalized study plan</p>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;

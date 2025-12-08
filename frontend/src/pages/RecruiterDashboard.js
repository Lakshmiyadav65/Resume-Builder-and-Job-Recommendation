import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FcUpload, FcRedo, FcDocument, FcBusinessman, FcGraduationCap, FcVip } from 'react-icons/fc';
import { FaChevronDown, FaTrash } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import { rankResumes } from '../services/api';
import Sidebar from '../components/Sidebar';
import './RecruiterDashboard.css';

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { sessionId, setSessionId, setUserRole, setRankedCandidates, rankedCandidates, resetSession } = useApp();

  const [resumeFiles, setResumeFiles] = useState([]);
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

  // Check if there's existing ranked candidates data on mount
  useEffect(() => {
    if (rankedCandidates && rankedCandidates.length > 0 && sessionId) {
      setAnalysisComplete(true);
    }
  }, [rankedCandidates, sessionId]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      setError('Some files were not PDF format and were skipped');
    } else {
      setError('');
    }
    
    setResumeFiles(prev => [...prev, ...pdfFiles]);
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
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      setError('Some files were not PDF format and were skipped');
    } else {
      setError('');
    }
    
    setResumeFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setResumeFiles(prev => prev.filter((_, i) => i !== index));
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
    
    if (trimmedText.length < 50) {
      return { valid: false, message: 'Job description is too short. Please provide a detailed job description (minimum 50 characters).' };
    }

    // Check for repeated patterns
    const words = trimmedText.toLowerCase().split(/\s+/);
    if (words.length > 5) {
      const uniqueWords = new Set(words);
      const repetitionRatio = uniqueWords.size / words.length;
      if (repetitionRatio < 0.3) {
        return { valid: false, message: 'Job description appears to contain repetitive text. Please provide a genuine job description.' };
      }
    }

    // Check if it's an error message being pasted back
    const lowerText = trimmedText.toLowerCase();
    if (lowerText.includes("doesn't appear to be") || lowerText.includes("please include job requirements") || lowerText.includes("error message")) {
      return { valid: false, message: 'Please enter a real job description, not an error message or placeholder text.' };
    }

    const uniqueChars = new Set(trimmedText.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size < 10) {
      return { valid: false, message: 'Job description appears to be invalid. Please enter a meaningful job description.' };
    }

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

    const wordCount = trimmedText.split(/\s+/).length;
    if (wordCount < 30) {
      return { valid: false, message: 'Job description is too brief. Please provide a detailed description (minimum 30 words) with role requirements and responsibilities.' };
    }

    return { valid: true, message: '' };
  };

  const handleRankResumes = async () => {
    if (resumeFiles.length === 0 || (!jobDesc.trim() && !jobDescFile)) {
      setError('Please upload at least one resume and provide a job description (paste or upload)');
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
      const newSessionId = `recruiter_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const formData = new FormData();
      resumeFiles.forEach((file, index) => {
        formData.append('resumes', file);
      });
      
      // Add job description (either text or file)
      if (jobDescFile) {
        formData.append('jobDescriptionFile', jobDescFile);
      } else {
        formData.append('jobDescription', jobDesc);
      }
      
      formData.append('sessionId', newSessionId);

      const response = await rankResumes(formData);

      if (response.success) {
        setSessionId(response.sessionId);
        setRankedCandidates(response.data.rankedCandidates || []);
        setAnalysisComplete(true);
      }
    } catch (err) {
      console.error('Ranking error:', err);
      // Enhanced error handling for validation errors
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.reason || 
                          err.response?.data?.error || 
                          'Ranking failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setResumeFiles([]);
    setJobDesc('');
    setJobDescFile(null);
    setAnalysisComplete(false);
    setError('');
    resetSession(); // This will clear all context data and localStorage
  };

  const viewDetailedRankings = () => {
    navigate('/recruiter-ranking');
  };

  const handleModeSwitch = (mode) => {
    setUserRole(mode);
    setShowModeDropdown(false);
    if (mode === 'student') {
      navigate('/dashboard');
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

  const getFitColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="recruiter-dashboard-container">
      <Sidebar />
      
      <div className="recruiter-dashboard-main">
        <motion.div
          className="recruiter-dashboard-header"
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
                <FcBusinessman style={{ fontSize: '1.3rem', marginRight: '8px' }} />
                Recruiter Mode
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
                      onClick={() => handleModeSwitch('recruiter')}
                    >
                      <FcBusinessman className="mode-icon" />
                      <div className="mode-text">
                        <span className="mode-title">Recruiter Mode</span>
                        <span className="mode-desc">Rank resumes & evaluate candidates</span>
                      </div>
                    </div>
                    <div 
                      className="mode-option"
                      onClick={() => handleModeSwitch('student')}
                    >
                      <FcGraduationCap className="mode-icon" />
                      <div className="mode-text">
                        <span className="mode-title">Student Mode</span>
                        <span className="mode-desc">Analyze your resume & prepare</span>
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
          className="recruiter-dashboard-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="section-title">AI Powered Resume Ranking</h2>

          {!analysisComplete ? (
            <div className="upload-section">
              <motion.div
                className="job-desc-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="job-desc-header">
                  <h3>Paste the Job Description Here</h3>
                  <div className="job-desc-actions">
                    <input
                      id="jd-file-upload-recruiter"
                      type="file"
                      accept=".pdf"
                      onChange={handleJobDescFileChange}
                      style={{ display: 'none' }}
                      disabled={analysisComplete}
                    />
                    <motion.button
                      className="upload-jd-button"
                      onClick={() => document.getElementById('jd-file-upload-recruiter').click()}
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

              <motion.div
                className="upload-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h3>Upload Candidate Resumes</h3>
                <div
                  className={`dropzone ${isDragging ? 'dragging' : ''} ${resumeFiles.length > 0 ? 'has-file' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input-multiple').click()}
                >
                  <input
                    id="file-input-multiple"
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={analysisComplete}
                  />
                  <FcUpload className="upload-icon" style={{ fontSize: '3.5rem' }} />
                  {resumeFiles.length > 0 ? (
                    <>
                      <p className="upload-text success">✓ {resumeFiles.length} resume(s) uploaded</p>
                      <p className="upload-hint">Click to add more resumes</p>
                    </>
                  ) : (
                    <>
                      <p className="upload-text">Drag and drop multiple resumes here</p>
                      <p className="upload-hint">Limit 200MB per file • PDF • Multiple files supported</p>
                    </>
                  )}
                </div>

                {resumeFiles.length > 0 && (
                  <div className="uploaded-files-list">
                    {resumeFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <FcDocument className="file-icon" />
                        <span className="file-name">{file.name}</span>
                        <button 
                          className="remove-file-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
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
                  onClick={handleRankResumes}
                  disabled={loading || analysisComplete}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Ranking Candidates...
                    </>
                  ) : (
                    <>
                      <FcVip style={{ marginRight: '8px' }} /> Rank Resumes
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
                  <h3 className="results-title">
                    <FcVip style={{ marginRight: '10px' }} /> Ranked Candidates
                  </h3>
                  <motion.button
                    className="new-analysis-button"
                    onClick={handleNewAnalysis}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FcRedo style={{ marginRight: '8px' }} /> New Analysis
                  </motion.button>
                </div>

                <div className="ranked-candidates">
                    {rankedCandidates.length > 0 ? (
                      <>
                        <div className="results-summary">
                          <p>Successfully ranked {rankedCandidates.length} candidates based on job requirements</p>
                          <motion.button
                            className="view-detailed-btn"
                            onClick={viewDetailedRankings}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            View Detailed Rankings →
                          </motion.button>
                        </div>
                        
                        {rankedCandidates.slice(0, 3).map((candidate, index) => (
                          <motion.div
                            key={index}
                            className="candidate-card-summary"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="rank-badge" style={{ backgroundColor: getFitColor(candidate.fitScore) }}>
                              #{index + 1}
                            </div>
                            <div className="candidate-info-summary">
                              <div className="candidate-header">
                                <h3>{candidate.name || `Candidate ${index + 1}`}</h3>
                                {candidate.resumeFilename && (
                                  <p className="filename-badge">📄 {candidate.resumeFilename}</p>
                                )}
                              </div>
                              <div className="fit-score" style={{ color: getFitColor(candidate.fitScore) }}>
                                {candidate.fitScore}% Match
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        
                        {rankedCandidates.length > 3 && (
                          <div className="more-candidates">
                            <p>+ {rankedCandidates.length - 3} more candidates</p>
                            <button className="view-all-btn" onClick={viewDetailedRankings}>
                              View All Rankings
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="no-data">
                        <p>No ranked candidates available</p>
                      </div>
                    )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;

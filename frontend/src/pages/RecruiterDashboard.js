import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FcUpload, FcRedo, FcDocument, FcBusinessman, FcGraduationCap, FcVip } from 'react-icons/fc';
import { FaChevronDown, FaTrash } from 'react-icons/fa';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';
import { rankResumes } from '../services/api';
import Sidebar from '../components/Sidebar';
import './RecruiterDashboard.css';

const MotionCard = motion(Card);

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
            <div className="mode-selector">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="mode-badge gap-2 bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white">
                    <FcBusinessman style={{ fontSize: '1.3rem' }} />
                    Recruiter Mode
                    <FaChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-900 border-slate-700 text-slate-200">
                  <DropdownMenuLabel>Select Mode</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800 focus:text-white" onClick={() => handleModeSwitch('recruiter')}>
                    <FcBusinessman className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Recruiter Mode</span>
                      <span className="text-xs text-slate-400">Rank & evaluate</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800 focus:text-white" onClick={() => handleModeSwitch('student')}>
                    <FcGraduationCap className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Student Mode</span>
                      <span className="text-xs text-slate-400">Analyze & prepare</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <MotionCard
                className="job-desc-card bg-slate-800/50 border-slate-700 mb-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl">Paste the Job Description Here</CardTitle>
                  <div className="job-desc-actions">
                    <input
                      id="jd-file-upload-recruiter"
                      type="file"
                      accept=".pdf"
                      onChange={handleJobDescFileChange}
                      style={{ display: 'none' }}
                      disabled={analysisComplete}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="upload-jd-button gap-2 bg-slate-700 border-slate-600 hover:bg-slate-600"
                      onClick={() => document.getElementById('jd-file-upload-recruiter').click()}
                      disabled={analysisComplete}
                      title="Upload job description PDF"
                    >
                      <FcUpload /> Upload PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {jobDescFile ? (
                    <div className="jd-file-display flex items-center justify-between bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                      <div className="jd-file-info flex items-center gap-4">
                        <FcDocument className="jd-file-icon" style={{ fontSize: '2rem' }} />
                        <div className="jd-file-details">
                          <p className="jd-file-name font-medium text-slate-200">{jobDescFile.name}</p>
                          <p className="jd-file-size text-xs text-slate-400">{(jobDescFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="jd-remove-button hover:bg-red-500/20 hover:text-red-400"
                        onClick={removeJobDescFile}
                        disabled={analysisComplete}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Textarea
                      className="job-desc-textarea min-h-[150px] bg-slate-900/50 border-slate-600 focus:border-indigo-500"
                      placeholder="Enter the job description..."
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                      disabled={analysisComplete}
                    />
                  )}
                </CardContent>
              </MotionCard>

              <MotionCard
                className="upload-card bg-slate-800/50 border-slate-700"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <CardHeader>
                  <CardTitle>Upload Candidate Resumes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`dropzone ${isDragging ? 'dragging' : ''} ${resumeFiles.length > 0 ? 'has-file' : ''} border-2 border-dashed border-slate-600 rounded-lg p-8 text-center transition-colors hover:border-indigo-500 hover:bg-slate-700/50 cursor-pointer`}
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
                    <FcUpload className="upload-icon mx-auto mb-4" style={{ fontSize: '3.5rem' }} />
                    {resumeFiles.length > 0 ? (
                      <>
                        <p className="upload-text success text-green-400 font-medium">✓ {resumeFiles.length} resume(s) uploaded</p>
                        <p className="upload-hint text-xs text-slate-400">Click to add more resumes</p>
                      </>
                    ) : (
                      <>
                        <p className="upload-text font-medium text-slate-300">Drag and drop multiple resumes here</p>
                        <p className="upload-hint text-xs text-slate-400">Limit 200MB per file • PDF • Multiple files supported</p>
                      </>
                    )}
                  </div>

                  {resumeFiles.length > 0 && (
                    <div className="uploaded-files-list mt-4 space-y-2 max-h-40 overflow-y-auto pr-2">
                      {resumeFiles.map((file, index) => (
                        <div key={index} className="file-item flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/50">
                          <div className="flex items-center gap-2">
                            <FcDocument className="file-icon" />
                            <span className="file-name text-sm text-slate-300 truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="remove-file-btn h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                          >
                            <FaTrash className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </MotionCard>

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
                <Button
                  className="analyze-button w-full shadow-lg hover:shadow-indigo-500/25"
                  variant="gradient"
                  size="lg"
                  onClick={handleRankResumes}
                  disabled={loading || analysisComplete}
                >
                  {loading ? (
                    <>
                      <div className="spinner mr-2"></div>
                      Ranking Candidates...
                    </>
                  ) : (
                    <>
                      <FcVip style={{ marginRight: '8px' }} /> Rank Resumes
                    </>
                  )}
                </Button>
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
                  <Button
                    variant="outline"
                    className="new-analysis-button gap-2 border-slate-600 hover:bg-slate-700"
                    onClick={handleNewAnalysis}
                  >
                    <FcRedo /> New Analysis
                  </Button>
                </div>

                <div className="ranked-candidates">
                  {rankedCandidates.length > 0 ? (
                    <>
                      <div className="results-summary">
                        <p>Successfully ranked {rankedCandidates.length} candidates based on job requirements</p>
                        <Button
                          variant="link"
                          className="view-detailed-btn text-indigo-400 hover:text-indigo-300 p-0 h-auto font-semibold"
                          onClick={viewDetailedRankings}
                        >
                          View Detailed Rankings →
                        </Button>
                      </div>

                      {rankedCandidates.slice(0, 3).map((candidate, index) => (
                        <MotionCard
                          key={index}
                          className="candidate-card-summary mb-4 border-l-4 bg-slate-800/50 border-r-slate-700 border-t-slate-700 border-b-slate-700 hover:shadow-lg transition-transform"
                          style={{ borderLeftColor: getFitColor(candidate.fitScore) }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            <Badge
                              className="rank-badge w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0 p-0"
                              style={{ backgroundColor: getFitColor(candidate.fitScore) }}
                            >
                              #{index + 1}
                            </Badge>
                            <div className="candidate-info-summary flex-1">
                              <div className="candidate-header flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-lg">{candidate.name || `Candidate ${index + 1}`}</h3>
                                {candidate.resumeFilename && (
                                  <Badge variant="secondary" className="filename-badge text-xs px-2 py-1 rounded text-slate-300 bg-slate-700/50 hover:bg-slate-700">📄 {candidate.resumeFilename}</Badge>
                                )}
                              </div>
                              <div className="fit-score font-bold" style={{ color: getFitColor(candidate.fitScore) }}>
                                {candidate.fitScore}% Match
                              </div>
                            </div>
                          </CardContent>
                        </MotionCard>
                      ))}

                      {rankedCandidates.length > 3 && (
                        <div className="more-candidates">
                          <p>+ {rankedCandidates.length - 3} more candidates</p>
                          <Button
                            variant="secondary"
                            className="view-all-btn w-full mt-2"
                            onClick={viewDetailedRankings}
                          >
                            View All Rankings
                          </Button>
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

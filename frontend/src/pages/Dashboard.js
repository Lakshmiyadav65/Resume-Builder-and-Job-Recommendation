import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FcUpload, FcDocument, FcVoicePresentation, FcSearch, FcCalendar, FcGraduationCap, FcBusinessman, FcRedo, FcBarChart } from 'react-icons/fc';
import { FaChevronDown } from 'react-icons/fa';
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
import { useApp } from '../context/AppContext';
import { analyzeResume } from '../services/api';
import Sidebar from '../components/Sidebar';
import CircularGauge from '../components/CircularGauge';
import './Dashboard.css';

const MotionCard = motion(Card);

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
            <div className="mode-selector">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="mode-badge gap-2 bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white">
                    <FcGraduationCap style={{ fontSize: '1.3rem' }} />
                    Student Mode
                    <FaChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-900 border-slate-700 text-slate-200">
                  <DropdownMenuLabel>Select Mode</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800 focus:text-white" onClick={() => handleModeSwitch('student')}>
                    <FcGraduationCap className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Student Mode</span>
                      <span className="text-xs text-slate-400">Analyze & prepare</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800 focus:text-white" onClick={() => handleModeSwitch('recruiter')}>
                    <FcBusinessman className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Recruiter Mode</span>
                      <span className="text-xs text-slate-400">Rank & evaluate</span>
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
                  <MotionCard
                    className="choice-card cursor-pointer bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-indigo-500 transition-colors"
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => navigate('/resume-builder')}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="choice-icon text-4xl mb-4">✨</div>
                      <CardTitle>Build from Scratch</CardTitle>
                      <CardDescription>Create a professional resume with our AI-powered builder</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="choice-features space-y-2 text-sm text-slate-300">
                        <li>✓ Step-by-step guidance</li>
                        <li>✓ AI content enhancement</li>
                        <li>✓ Professional templates</li>
                      </ul>
                    </CardContent>
                  </MotionCard>

                  <MotionCard
                    className="choice-card bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-colors"
                    whileHover={{ scale: 1.03, y: -5 }}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="choice-icon text-4xl mb-4">📄</div>
                      <CardTitle>Upload Existing Resume</CardTitle>
                      <CardDescription>Analyze and improve your current resume</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="upload-inner">
                        <div
                          className={`dropzone ${isDragging ? 'dragging' : ''} ${resumeFile ? 'has-file' : ''} border-2 border-dashed border-slate-600 rounded-lg p-6 text-center transition-colors hover:border-indigo-500 hover:bg-slate-700/50 cursor-pointer`}
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
                          <FcUpload className="upload-icon-small mx-auto mb-2" style={{ fontSize: '2.5rem' }} />
                          {resumeFile ? (
                            <>
                              <p className="upload-text success text-green-400 font-medium">✓ {resumeFile.name}</p>
                              <p className="upload-hint text-xs text-slate-400">Click to change file</p>
                            </>
                          ) : (
                            <>
                              <p className="upload-text-small font-medium text-slate-300">Drag and drop or click</p>
                              <p className="upload-hint text-xs text-slate-400">PDF only, max 20MB</p>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </MotionCard>
                </div>
              </motion.div>

              <MotionCard
                className="job-desc-card bg-slate-800/50 border-slate-700 mt-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl">Paste the Job Description Here</CardTitle>
                  <div className="job-desc-actions">
                    <input
                      id="jd-file-upload"
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
                      onClick={() => document.getElementById('jd-file-upload').click()}
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
                  onClick={handleAnalyze}
                  disabled={loading || analysisComplete}
                >
                  {loading ? (
                    <>
                      <div className="spinner mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FcBarChart style={{ marginRight: '8px', fontSize: '1.2rem' }} /> Start Analysis
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
                  <h2><FcBarChart style={{ marginRight: '10px', fontSize: '1.8rem' }} />Match Scores</h2>
                  <Button
                    variant="outline"
                    className="new-analysis-button gap-2 border-slate-600 hover:bg-slate-700"
                    onClick={handleNewAnalysis}
                  >
                    <FcRedo /> New Analysis
                  </Button>
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

                <Card className="feedback-section bg-slate-800/50 border-slate-700 mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <FcDocument className="mr-3 text-2xl" /> Qualitative Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="feedback-content text-slate-300">
                      {renderFormattedFeedback(analysisData?.feedback)}
                    </div>
                  </CardContent>
                </Card>

                <div className="navigation-cards grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <MotionCard
                    className="nav-card cursor-pointer bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-indigo-500 transition-colors"
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => navigate('/chat')}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-4">
                        <FcVoicePresentation className="text-5xl" />
                      </div>
                      <CardTitle className="text-lg">Chat with Resume</CardTitle>
                      <CardDescription>Ask questions about your resume</CardDescription>
                    </CardHeader>
                  </MotionCard>

                  <MotionCard
                    className="nav-card cursor-pointer bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-indigo-500 transition-colors"
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => navigate('/deep-dive')}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-4">
                        <FcSearch className="text-5xl" />
                      </div>
                      <CardTitle className="text-lg">Deep Dive</CardTitle>
                      <CardDescription>Detailed skills gap analysis</CardDescription>
                    </CardHeader>
                  </MotionCard>

                  <MotionCard
                    className="nav-card cursor-pointer bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-indigo-500 transition-colors"
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => navigate('/preparation')}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-4">
                        <FcCalendar className="text-5xl" />
                      </div>
                      <CardTitle className="text-lg">Preparation Plan</CardTitle>
                      <CardDescription>Get personalized study plan</CardDescription>
                    </CardHeader>
                  </MotionCard>
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

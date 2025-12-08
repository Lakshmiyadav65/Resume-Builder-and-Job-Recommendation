import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FcTodoList, FcIdea } from 'react-icons/fc';
import { generateAssignments } from '../services/api';
import Sidebar from '../components/Sidebar';
import './AssignmentGenerator.css';

const AssignmentGenerator = () => {
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [generated, setGenerated] = useState(false);

  const validateJobDescription = (text) => {
    const trimmedText = text.trim();
    
    if (trimmedText.length < 50) {
      return { valid: false, message: 'Job description is too short. Please provide a detailed job description (minimum 50 characters).' };
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
      'knowledge', 'ability', 'proficient', 'expertise'
    ];

    const lowerText = trimmedText.toLowerCase();
    const hasJobKeywords = jobKeywords.some(keyword => lowerText.includes(keyword));

    if (!hasJobKeywords) {
      return { valid: false, message: 'This doesn\'t appear to be a valid job description. Please include job requirements, responsibilities, or qualifications.' };
    }

    const wordCount = trimmedText.split(/\s+/).length;
    if (wordCount < 20) {
      return { valid: false, message: 'Job description is too brief. Please provide a more detailed description (minimum 20 words).' };
    }

    return { valid: true, message: '' };
  };

  const handleGenerateAssignments = async () => {
    if (!jobDesc.trim()) {
      setError('Please enter a job description');
      return;
    }

    const validation = validateJobDescription(jobDesc);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await generateAssignments({ jobDescription: jobDesc });

      if (response.success) {
        setAssignments(response.data.assignments || []);
        setGenerated(true);
      }
    } catch (err) {
      console.error('Assignment generation error:', err);
      setError(err.response?.data?.reason || err.response?.data?.error || 'Assignment generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewGeneration = () => {
    setJobDesc('');
    setAssignments([]);
    setGenerated(false);
    setError('');
  };

  return (
    <div className="assignment-generator-container">
      <Sidebar />
      
      <div className="assignment-generator-main">
        <motion.div
          className="assignment-generator-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-left">
            <span className="mode-badge">💼 Recruiter Mode</span>
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
          className="assignment-generator-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="section-title">📋 Assignment Idea Generator</h2>

          {!generated ? (
            <div className="input-section">
              <motion.div
                className="job-desc-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3>Enter Job Description</h3>
                <p className="description-hint">
                  Paste the complete job description to generate skill-based assignment ideas
                  that help evaluate candidates effectively.
                </p>
                <textarea
                  className="job-desc-textarea"
                  placeholder="Enter the job description here..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  disabled={generated}
                />
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
                  className="generate-button"
                  onClick={handleGenerateAssignments}
                  disabled={loading || generated}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Generating Ideas...
                    </>
                  ) : (
                    <>
                      <FcIdea style={{ marginRight: '8px', fontSize: '1.3rem' }} /> Generate Assignment Ideas
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.div
              className="results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="results-header">
                <h2>💡 Generated Assignment Ideas</h2>
                <motion.button
                  className="new-generation-button"
                  onClick={handleNewGeneration}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FcTodoList style={{ marginRight: '8px' }} /> New Generation
                </motion.button>
              </div>

              <div className="assignments-list">
                {assignments.length > 0 ? (
                  assignments.map((assignment, index) => (
                    <motion.div
                      key={index}
                      className="assignment-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="assignment-number">{index + 1}</div>
                      <div className="assignment-content">
                        <h3>{assignment.title}</h3>
                        <p className="assignment-description">{assignment.description}</p>
                        <div className="assignment-meta">
                          <div className="meta-item">
                            <strong>📊 Evaluation Criteria:</strong>
                            <span>{assignment.evaluationCriteria}</span>
                          </div>
                          <div className="meta-item">
                            <strong>⏱️ Estimated Time:</strong>
                            <span>{assignment.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="no-data">
                    <p>No assignments generated</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AssignmentGenerator;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FcTodoList, FcIdea } from 'react-icons/fc';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
            <Badge variant="outline" className="mode-badge bg-slate-800 text-slate-300 border-slate-600 gap-2 px-3 py-1 text-sm font-medium">
              💼 Recruiter Mode
            </Badge>
          </div>
          <div className="header-right">
            <Button
              variant="ghost"
              className="share-button text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Share
            </Button>
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
            <div className="input-section max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="job-desc-card bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-xl text-white">Enter Job Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="description-hint text-slate-400 mb-4 text-sm">
                      Paste the complete job description to generate skill-based assignment ideas
                      that help evaluate candidates effectively.
                    </p>
                    <Textarea
                      className="job-desc-textarea bg-slate-900 border-slate-600 min-h-[200px] text-slate-200 resize-y"
                      placeholder="Enter the job description here..."
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                      disabled={generated}
                    />
                  </CardContent>
                </Card>
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

              <div className="action-buttons mt-6 flex justify-center">
                <Button
                  variant="gradient"
                  size="lg"
                  className="generate-button w-full md:w-auto min-w-[200px] shadow-lg hover:shadow-indigo-500/25"
                  onClick={handleGenerateAssignments}
                  disabled={loading || generated}
                >
                  {loading ? (
                    <>
                      <div className="spinner mr-2"></div>
                      Generating Ideas...
                    </>
                  ) : (
                    <>
                      <FcIdea style={{ marginRight: '8px', fontSize: '1.3rem' }} /> Generate Assignment Ideas
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              className="results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="results-header flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">💡 Generated Assignment Ideas</h2>
                <Button
                  variant="outline"
                  className="new-generation-button border-slate-600 hover:bg-slate-700"
                  onClick={handleNewGeneration}
                >
                  <FcTodoList style={{ marginRight: '8px' }} /> New Generation
                </Button>
              </div>

              <div className="assignments-list">
                {assignments.length > 0 ? (
                  assignments.map((assignment, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="assignment-card bg-slate-800 border-slate-700 hover:bg-slate-700/50 transition-colors">
                        <CardContent className="p-6 flex gap-4">
                          <div className="assignment-number flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm shrink-0 h-fit mt-1">
                            {index + 1}
                          </div>
                          <div className="assignment-content flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">{assignment.title}</h3>
                            <p className="assignment-description text-slate-300 mb-4">{assignment.description}</p>
                            <div className="assignment-meta flex flex-wrap gap-4 text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                              <div className="meta-item flex items-center gap-2">
                                <strong className="text-indigo-300">📊 Evaluation Criteria:</strong>
                                <span className="text-slate-400">{assignment.evaluationCriteria}</span>
                              </div>
                              <div className="meta-item flex items-center gap-2">
                                <strong className="text-indigo-300">⏱️ Estimated Time:</strong>
                                <span className="text-slate-400">{assignment.estimatedTime}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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

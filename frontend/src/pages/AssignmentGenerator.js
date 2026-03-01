import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FcTodoList, FcIdea, FcUpload } from 'react-icons/fc';
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
          className="assignment-generator-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="section-title">Assignment Idea Generator</h2>

          {!generated ? (
            <div className="input-section w-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full"
              >
                <Card className="job-desc-card bg-[#141824]/80 border-slate-800 w-full overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-3xl font-extrabold text-white">Paste the Job Description Here</CardTitle>
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-slate-200 gap-2 px-4 py-5"
                      >
                        <FcUpload /> Upload PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="description-hint text-slate-400 mb-8 text-lg">
                      Paste the complete job description to generate skill-based assignment ideas that help evaluate candidates effectively.
                    </p>
                    <Textarea
                      className="job-desc-textarea bg-slate-900 border-slate-600 min-h-[350px] text-slate-200 resize-y focus:ring-2 focus:ring-indigo-500/20"
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

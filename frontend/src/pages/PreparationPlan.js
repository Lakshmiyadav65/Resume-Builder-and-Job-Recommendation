import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcCalendar, FcIdea, FcClock, FcPlanner } from 'react-icons/fc';
import { useApp } from '../context/AppContext';
import { generatePrepPlan } from '../services/api';
import Sidebar from '../components/Sidebar';
import ReactMarkdown from 'react-markdown';
import './PreparationPlan.css';

const PreparationPlan = () => {
  const navigate = useNavigate();
  const { sessionId, analysisData } = useApp();
  const [days, setDays] = useState(30);
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!sessionId || !analysisData) {
    return (
      <div className="prep-plan-container">
        <Sidebar />
        <div className="prep-plan-main">
          <motion.div
            className="no-data"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2>⚠️ No Analysis Data Found</h2>
            <p>Please upload resume & job description and complete analysis first.</p>
            <motion.button
              className="dashboard-button"
              onClick={() => navigate('/dashboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🏠 Go to Dashboard
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleGeneratePlan = async () => {
    if (days < 1 || days > 365) {
      setError('Please enter a valid number of days (1-365)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await generatePrepPlan(sessionId, days);
      if (response.success) {
        setPlan(response.planText);
      }
    } catch (err) {
      console.error('Failed to generate plan:', err);
      setError(err.response?.data?.error || 'Failed to generate preparation plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickDaysOptions = [7, 14, 30, 60, 90];

  return (
    <div className="prep-plan-container">
      <Sidebar />
      
      <div className="prep-plan-main">
        <motion.div
          className="prep-plan-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FcCalendar className="header-icon" style={{ fontSize: '3rem' }} />
          <h1>Preparation Plan</h1>
        </motion.div>

        <motion.div
          className="prep-plan-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {!plan ? (
            <div className="plan-input-section">
              <motion.div
                className="input-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="card-header">
                  <FcClock className="card-icon" style={{ fontSize: '2.5rem' }} />
                  <h2>How many days do you have for preparation?</h2>
                </div>

                <div className="days-input-container">
                  <input
                    type="number"
                    className="days-input"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                    min="1"
                    max="365"
                    placeholder="Enter days..."
                  />
                  <span className="days-label">days</span>
                </div>

                <div className="quick-options">
                  <p>Quick select:</p>
                  <div className="quick-buttons">
                    {quickDaysOptions.map((option) => (
                      <motion.button
                        key={option}
                        className={`quick-button ${days === option ? 'active' : ''}`}
                        onClick={() => setDays(option)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {option} days
                      </motion.button>
                    ))}
                  </div>
                </div>

                {error && (
                  <motion.div
                    className="error-message"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                <motion.button
                  className="generate-button"
                  onClick={handleGeneratePlan}
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <FcIdea style={{ marginRight: '8px', fontSize: '1.3rem' }} /> Generate Preparation Plan
                    </>
                  )}
                </motion.button>

                <div className="info-box">
                  <p>
                    <strong><FcPlanner style={{ marginRight: '5px' }} />What you'll get:</strong>
                  </p>
                  <ul>
                    <li>Structured phase breakdown of your preparation timeline</li>
                    <li>Daily schedule with specific tasks and time allocations</li>
                    <li>Focused recommendations on missing skills and weak areas</li>
                    <li>Curated resources, courses, and practice platforms</li>
                    <li>Weekly milestones and checkpoints</li>
                    <li>Mock interview schedule and resume update guidance</li>
                  </ul>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              className="plan-display-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="plan-header">
                <div className="plan-title">
                  <h2>✅ Your {days}-Day Preparation Plan</h2>
                  <p>Personalized plan generated based on your resume and target job description</p>
                </div>
                <motion.button
                  className="new-plan-button"
                  onClick={() => setPlan('')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Generate New Plan
                </motion.button>
              </div>

              <div className="plan-content">
                <ReactMarkdown>{plan}</ReactMarkdown>
              </div>

              <div className="plan-actions">
                <motion.button
                  className="action-button primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const blob = new Blob([plan], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `preparation-plan-${days}-days.md`;
                    a.click();
                  }}
                >
                  📥 Download Plan
                </motion.button>
                <motion.button
                  className="action-button secondary"
                  onClick={() => navigate('/deep-dive')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🔬 View Deep Dive
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PreparationPlan;

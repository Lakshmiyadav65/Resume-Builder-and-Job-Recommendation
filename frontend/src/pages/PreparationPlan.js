import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcCalendar, FcIdea, FcClock, FcPlanner } from 'react-icons/fc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
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
            <Button
              className="dashboard-button"
              onClick={() => navigate('/dashboard')}
            >
              🏠 Go to Dashboard
            </Button>
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
          className="prep-plan-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {!plan ? (
            <div className="plan-input-section max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="input-card bg-slate-800 border-slate-700">
                  <CardContent className="p-8">
                    <div className="card-header flex flex-col items-center mb-8">
                      <FcClock className="card-icon mb-4" style={{ fontSize: '3.5rem' }} />
                      <h2 className="text-2xl font-bold text-center text-white">How many days do you have for preparation?</h2>
                    </div>

                    <div className="days-input-container flex items-center justify-center gap-4 mb-8">
                      <Input
                        type="number"
                        className="days-input w-32 text-center text-lg h-12 bg-slate-700 border-slate-600 text-white"
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                        min="1"
                        max="365"
                        placeholder="30"
                      />
                      <span className="days-label text-xl text-slate-300">days</span>
                    </div>

                    <div className="quick-options mb-8">
                      <p className="text-center text-slate-400 mb-4">Quick select:</p>
                      <div className="quick-buttons flex flex-wrap justify-center gap-3">
                        {quickDaysOptions.map((option) => (
                          <Button
                            key={option}
                            variant={days === option ? "default" : "outline"}
                            className={`quick-button ${days === option ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-600 hover:bg-slate-700'}`}
                            onClick={() => setDays(option)}
                          >
                            {option} days
                          </Button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        className="error-message text-red-400 text-center mb-6 bg-red-900/20 p-3 rounded"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        ⚠️ {error}
                      </motion.div>
                    )}

                    <Button
                      variant="gradient"
                      size="lg"
                      className="generate-button w-full h-14 text-lg shadow-lg hover:shadow-indigo-500/25"
                      onClick={handleGeneratePlan}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="spinner mr-2"></div>
                          Generating Plan...
                        </>
                      ) : (
                        <>
                          <FcIdea style={{ marginRight: '8px', fontSize: '1.5rem' }} /> Generate Preparation Plan
                        </>
                      )}
                    </Button>

                    <div className="info-box mt-8 bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                      <p className="mb-2 text-indigo-300 flex items-center">
                        <strong><FcPlanner style={{ marginRight: '8px', fontSize: '1.2rem' }} />What you'll get:</strong>
                      </p>
                      <ul className="list-disc list-inside text-sm text-slate-400 space-y-1 ml-1">
                        <li>Structured phase breakdown of your preparation timeline</li>
                        <li>Daily schedule with specific tasks and time allocations</li>
                        <li>Focused recommendations on missing skills and weak areas</li>
                        <li>Curated resources, courses, and practice platforms</li>
                        <li>Weekly milestones and checkpoints</li>
                        <li>Mock interview schedule and resume update guidance</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          ) : (
            <motion.div
              className="plan-display-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="plan-header flex items-center justify-between mb-6">
                <div className="plan-title">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">✅ Your {days}-Day Preparation Plan</h2>
                  <p className="text-slate-400">Personalized plan generated based on your resume and target job description</p>
                </div>
                <Button
                  variant="outline"
                  className="new-plan-button border-slate-600 hover:bg-slate-700"
                  onClick={() => setPlan('')}
                >
                  Generate New Plan
                </Button>
              </div>

              <Card className="plan-content bg-slate-800/50 border-slate-700 p-6 mb-8">
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{plan}</ReactMarkdown>
                </div>
              </Card>

              <div className="plan-actions flex justify-center gap-4">
                <Button
                  variant="gradient"
                  className="action-button primary gap-2"
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
                </Button>
                <Button
                  variant="secondary"
                  className="action-button secondary gap-2"
                  onClick={() => navigate('/deep-dive')}
                >
                  🔬 View Deep Dive
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PreparationPlan;

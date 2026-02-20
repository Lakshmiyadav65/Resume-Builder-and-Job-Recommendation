import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcVip, FcDocument, FcBusinessman, FcLeft } from 'react-icons/fc';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import './RecruiterRanking.css';

const MotionCard = motion(Card);

const RecruiterRanking = () => {
  const navigate = useNavigate();
  const { rankedCandidates } = useApp();

  const getFitColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="recruiter-ranking-container">
      <Sidebar />

      <div className="recruiter-ranking-main">
        <motion.div
          className="recruiter-ranking-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-left">
            <Badge variant="outline" className="mode-badge gap-2 bg-slate-800 text-slate-200 border-slate-700 px-3 py-1 text-sm font-medium">
              <FcBusinessman style={{ fontSize: '1.3rem' }} /> Recruiter Mode
            </Badge>
          </div>
          <div className="header-right">
            <Button className="share-button" variant="ghost" size="sm">
              Share
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="recruiter-ranking-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="page-header flex items-center mb-6">
            <Button
              variant="ghost"
              className="back-button gap-2 text-slate-400 hover:text-white mr-4"
              onClick={() => navigate('/recruiter-dashboard')}
            >
              <FcLeft /> Back to Dashboard
            </Button>
            <h2 className="section-title text-2xl font-bold flex items-center text-white"><FcVip className="mr-3 text-3xl" />Ranked Candidates</h2>
          </div>

          {rankedCandidates && rankedCandidates.length > 0 ? (
            <div className="ranked-candidates">
              {rankedCandidates.map((candidate, index) => (
                <MotionCard
                  key={index}
                  className="candidate-card-simple mb-3 bg-slate-800/50 border-slate-700"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Badge
                        className="rank-badge w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm p-0"
                        style={{ backgroundColor: getFitColor(candidate.fitScore) }}
                      >
                        #{index + 1}
                      </Badge>
                      <div className="candidate-info">
                        <p className="candidate-name font-semibold text-lg text-slate-200">{candidate.name || `Candidate ${index + 1}`}</p>
                        <p className="resume-filename text-sm text-slate-400 flex items-center gap-1"><FcDocument />{candidate.fileName}</p>
                      </div>
                    </div>
                    <div className="fit-score font-bold text-lg" style={{ color: getFitColor(candidate.fitScore) }}>
                      {candidate.fitScore}% Match
                    </div>
                  </CardContent>
                </MotionCard>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <h3>No Rankings Available</h3>
              <p>Please upload and analyze resumes from the Dashboard first.</p>
              <Button
                className="go-dashboard-button mt-4"
                onClick={() => navigate('/recruiter-dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RecruiterRanking;

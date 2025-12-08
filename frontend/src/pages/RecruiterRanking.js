import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcVip, FcDocument, FcBusinessman, FcLeft } from 'react-icons/fc';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import './RecruiterRanking.css';

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
            <span className="mode-badge"><FcBusinessman style={{ fontSize: '1.3rem', marginRight: '8px' }} />Recruiter Mode</span>
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
          className="recruiter-ranking-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="page-header">
            <motion.button
              className="back-button"
              onClick={() => navigate('/recruiter-dashboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FcLeft /> Back to Dashboard
            </motion.button>
            <h2 className="section-title"><FcVip style={{ marginRight: '10px', fontSize: '2rem' }} />Ranked Candidates</h2>
          </div>

          {rankedCandidates && rankedCandidates.length > 0 ? (
            <div className="ranked-candidates">
              {rankedCandidates.map((candidate, index) => (
                <motion.div
                  key={index}
                  className="candidate-card-simple"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="rank-badge" style={{ backgroundColor: getFitColor(candidate.fitScore) }}>
                    #{index + 1}
                  </div>
                  <div className="candidate-info-simple">
                    <div className="candidate-name-section">
                      <p className="candidate-name">{candidate.name || `Candidate ${index + 1}`}</p>
                      <p className="resume-filename"><FcDocument style={{ marginRight: '5px' }} />{candidate.fileName}</p>
                    </div>
                    <div className="fit-score" style={{ color: getFitColor(candidate.fitScore) }}>
                      {candidate.fitScore}% Match
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <h3>No Rankings Available</h3>
              <p>Please upload and analyze resumes from the Dashboard first.</p>
              <motion.button
                className="go-dashboard-button"
                onClick={() => navigate('/recruiter-dashboard')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Go to Dashboard
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RecruiterRanking;

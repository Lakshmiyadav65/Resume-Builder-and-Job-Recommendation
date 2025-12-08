import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcOk, FcCancel, FcIdea, FcLineChart, FcBarChart, FcAreaChart, FcBullish, FcSearch } from 'react-icons/fc';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import './DeepDive.css';

const DeepDive = () => {
  const navigate = useNavigate();
  const { analysisData } = useApp();

  if (!analysisData) {
    return (
      <div className="deep-dive-container">
        <Sidebar />
        <div className="deep-dive-main">
          <motion.div
            className="no-data"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2>⚠️ No Analysis Data Found</h2>
            <p>Please run an analysis on the Dashboard first.</p>
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

  const matchesSkill = (required, presentList) => {
    return presentList.some(p => 
      required.toLowerCase().includes(p.toLowerCase()) || 
      p.toLowerCase().includes(required.toLowerCase())
    );
  };

  // Calculate skill statistics
  const calculateSkillStats = () => {
    const softReq = analysisData.softSkillsRequired || [];
    const softPres = analysisData.softSkillsPresent || [];
    const techReq = analysisData.technicalSkillsRequired || [];
    const techPres = analysisData.technicalSkillsPresent || [];

    const softMatched = softReq.filter(s => matchesSkill(s, softPres)).length;
    const techMatched = techReq.filter(t => matchesSkill(t, techPres)).length;

    const softCoverage = softReq.length > 0 ? (softMatched / softReq.length) * 100 : 100;
    const techCoverage = techReq.length > 0 ? (techMatched / techReq.length) * 100 : 100;

    // Determine skill balance
    let balanceMessage = '';
    if (Math.abs(softCoverage - techCoverage) < 10) {
      balanceMessage = 'balanced soft and technical skills';
    } else if (techCoverage > softCoverage) {
      balanceMessage = 'technically stronger profile';
    } else {
      balanceMessage = 'soft-skill oriented profile';
    }

    return {
      soft: { required: softReq.length, present: softPres.length, matched: softMatched, coverage: softCoverage },
      tech: { required: techReq.length, present: techPres.length, matched: techMatched, coverage: techCoverage },
      balance: balanceMessage
    };
  };

  const stats = calculateSkillStats();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="deep-dive-container">
      <Sidebar />
      
      <div className="deep-dive-main">
        <motion.div
          className="deep-dive-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FcSearch className="header-icon" style={{ fontSize: '3rem' }} />
          <h1>Deep Dive Report</h1>
        </motion.div>

        <motion.div
          className="deep-dive-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Skills Coverage Summary */}
          <motion.div className="coverage-summary" variants={itemVariants}>
            <div className="summary-card">
              <div className="summary-icon"><FcBarChart style={{ fontSize: '2.5rem' }} /></div>
              <div className="summary-content">
                <h3>Soft Skills Coverage</h3>
                <div className="coverage-bar">
                  <div 
                    className="coverage-fill soft" 
                    style={{ width: `${stats.soft.coverage}%` }}
                  >
                    {stats.soft.coverage.toFixed(1)}%
                  </div>
                </div>
                <p className="coverage-details">
                  {stats.soft.required > 0 
                    ? `${stats.soft.matched} of ${stats.soft.required} required, ${stats.soft.present} present`
                    : 'No specific soft skills required'}
                </p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon"><FcAreaChart style={{ fontSize: '2.5rem' }} /></div>
              <div className="summary-content">
                <h3>Technical Skills Coverage</h3>
                <div className="coverage-bar">
                  <div 
                    className="coverage-fill tech" 
                    style={{ width: `${stats.tech.coverage}%` }}
                  >
                    {stats.tech.coverage.toFixed(1)}%
                  </div>
                </div>
                <p className="coverage-details">
                  {stats.tech.required > 0
                    ? `${stats.tech.matched} of ${stats.tech.required} required, ${stats.tech.present} present`
                    : 'No specific technical skills required'}
                </p>
              </div>
            </div>

            <div className="summary-card balance">
              <div className="summary-icon">⚖️</div>
              <div className="summary-content">
                <h3>Profile Balance</h3>
                <p className="balance-text">Profile shows <strong>{stats.balance}</strong>.</p>
              </div>
            </div>

            <div className="summary-card suitability">
              <div className="summary-icon"><FcBullish style={{ fontSize: '2.5rem' }} /></div>
              <div className="summary-content">
                <h3>Final Suitability Index</h3>
                <p className="suitability-score">
                  {((0.7 * (analysisData.overallScore || 0) + 0.3 * (analysisData.skillScore || 0))).toFixed(2)}/100
                </p>
              </div>
            </div>
          </motion.div>

          <motion.h2 variants={itemVariants} className="section-title">
            <FcLineChart style={{ marginRight: '10px', fontSize: '2rem' }} />Skills Gap Analysis
          </motion.h2>

          <div className="skills-grid">
            <motion.div className="skill-card" variants={itemVariants}>
              <h3><FcIdea style={{ marginRight: '10px' }} />Soft Skills</h3>
              <div className="skill-section">
                <h4>Required:</h4>
                <div className="skill-tags">
                  {analysisData.softSkillsRequired?.length > 0 ? (
                    analysisData.softSkillsRequired.map((skill, index) => (
                      <span key={index} className="skill-tag required">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="no-specific-text">No specific soft skills required by job description</p>
                  )}
                </div>
              </div>
              <div className="skill-section">
                <h4>Present:</h4>
                <div className="skill-tags">
                  {analysisData.softSkillsPresent?.length > 0 ? (
                    analysisData.softSkillsPresent.map((skill, index) => (
                      <span key={index} className="skill-tag present">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="no-data-text">No soft skills detected in resume</p>
                  )}
                </div>
              </div>
              <div className="skill-section">
                <h4>Missing:</h4>
                <div className="skill-tags">
                  {analysisData.softSkillsRequired?.length > 0 ? (
                    analysisData.softSkillsRequired
                      .filter(skill => !matchesSkill(skill, analysisData.softSkillsPresent || []))
                      .length > 0 ? (
                        analysisData.softSkillsRequired
                          .filter(skill => !matchesSkill(skill, analysisData.softSkillsPresent || []))
                          .map((skill, index) => (
                            <span key={index} className="skill-tag missing">
                              <FcCancel /> {skill}
                            </span>
                          ))
                      ) : (
                        <p className="success-text">
                          <FcOk /> All required soft skills are covered
                        </p>
                      )
                  ) : (
                    <p className="no-specific-text">N/A - No specific requirements</p>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div className="skill-card" variants={itemVariants}>
              <h3><FcAreaChart style={{ marginRight: '10px' }} />Technical Skills</h3>
              <div className="skill-section">
                <h4>Required:</h4>
                <div className="skill-tags">
                  {analysisData.technicalSkillsRequired?.length > 0 ? (
                    analysisData.technicalSkillsRequired.map((skill, index) => (
                      <span key={index} className="skill-tag required">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="no-specific-text">No specific technical skills required by job description</p>
                  )}
                </div>
              </div>
              <div className="skill-section">
                <h4>Present:</h4>
                <div className="skill-tags">
                  {analysisData.technicalSkillsPresent?.length > 0 ? (
                    analysisData.technicalSkillsPresent.map((skill, index) => (
                      <span key={index} className="skill-tag present">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="no-data-text">No technical skills detected in resume</p>
                  )}
                </div>
              </div>
              <div className="skill-section">
                <h4>Missing:</h4>
                <div className="skill-tags">
                  {analysisData.technicalSkillsRequired?.length > 0 ? (
                    analysisData.technicalSkillsRequired
                      .filter(skill => !matchesSkill(skill, analysisData.technicalSkillsPresent || []))
                      .length > 0 ? (
                        analysisData.technicalSkillsRequired
                          .filter(skill => !matchesSkill(skill, analysisData.technicalSkillsPresent || []))
                          .map((skill, index) => (
                            <span key={index} className="skill-tag missing">
                              <FcCancel /> {skill}
                            </span>
                          ))
                      ) : (
                        <p className="success-text">
                          <FcOk /> All required technical skills are covered
                        </p>
                      )
                  ) : (
                    <p className="no-specific-text">N/A - No specific requirements</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div className="recommendations-section" variants={itemVariants}>
            <h2 className="section-title">
              <FcIdea style={{ marginRight: '10px', fontSize: '2rem' }} />Recommendations
            </h2>
            <div className="recommendations-list">
              {analysisData.recommendations?.length > 0 ? (
                analysisData.recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    className="recommendation-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="rec-number">{index + 1}</span>
                    <p>{rec}</p>
                  </motion.div>
                ))
              ) : (
                <p className="no-data-text">No recommendations available</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default DeepDive;

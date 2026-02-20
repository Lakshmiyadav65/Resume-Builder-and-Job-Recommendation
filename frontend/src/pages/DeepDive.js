import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcOk, FcCancel, FcIdea, FcLineChart, FcBarChart, FcAreaChart, FcBullish, FcSearch } from 'react-icons/fc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
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
          <motion.div className="coverage-summary grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" variants={itemVariants}>
            <Card className="summary-card bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="summary-icon mb-2"><FcBarChart style={{ fontSize: '2.5rem' }} /></div>
                <h3 className="text-lg font-semibold mb-2 text-slate-200">Soft Skills Coverage</h3>
                <Progress value={stats.soft.coverage} className="h-2 w-full mb-2" indicatorClassName="bg-green-500" />
                <span className="text-sm font-bold text-green-400 mb-1">{stats.soft.coverage.toFixed(1)}%</span>
                <p className="coverage-details text-xs text-slate-400">
                  {stats.soft.required > 0
                    ? `${stats.soft.matched} of ${stats.soft.required} required`
                    : 'No specific requirements'}
                </p>
              </CardContent>
            </Card>

            <Card className="summary-card bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="summary-icon mb-2"><FcAreaChart style={{ fontSize: '2.5rem' }} /></div>
                <h3 className="text-lg font-semibold mb-2 text-slate-200">Technical Skills Coverage</h3>
                <Progress value={stats.tech.coverage} className="h-2 w-full mb-2" indicatorClassName="bg-blue-500" />
                <span className="text-sm font-bold text-blue-400 mb-1">{stats.tech.coverage.toFixed(1)}%</span>
                <p className="coverage-details text-xs text-slate-400">
                  {stats.tech.required > 0
                    ? `${stats.tech.matched} of ${stats.tech.required} required`
                    : 'No specific requirements'}
                </p>
              </CardContent>
            </Card>

            <Card className="summary-card balance bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex flex-col items-center text-center h-full justify-center">
                <div className="summary-icon mb-2 text-4xl">⚖️</div>
                <h3 className="text-lg font-semibold mb-2 text-slate-200">Profile Balance</h3>
                <p className="balance-text text-sm text-slate-300">Profile shows <strong>{stats.balance}</strong>.</p>
              </CardContent>
            </Card>

            <Card className="summary-card suitability bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex flex-col items-center text-center h-full justify-center">
                <div className="summary-icon mb-2"><FcBullish style={{ fontSize: '2.5rem' }} /></div>
                <h3 className="text-lg font-semibold mb-2 text-slate-200">Suitability Index</h3>
                <p className="suitability-score text-3xl font-bold text-indigo-400">
                  {((0.7 * (analysisData.overallScore || 0) + 0.3 * (analysisData.skillScore || 0))).toFixed(0)}/100
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.h2 variants={itemVariants} className="section-title">
            <FcLineChart style={{ marginRight: '10px', fontSize: '2rem' }} />Skills Gap Analysis
          </motion.h2>

          <div className="skills-grid">
            <motion.div className="skill-card component-card" variants={itemVariants}>
              <Card className="bg-slate-800 border-slate-700 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-white">
                    <FcIdea /> Soft Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="skill-section">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Required:</h4>
                    <div className="skill-tags flex flex-wrap gap-2">
                      {analysisData.softSkillsRequired?.length > 0 ? (
                        analysisData.softSkillsRequired.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-slate-300 border-slate-600">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No specific requirements</p>
                      )}
                    </div>
                  </div>
                  <div className="skill-section">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Present:</h4>
                    <div className="skill-tags flex flex-wrap gap-2">
                      {analysisData.softSkillsPresent?.length > 0 ? (
                        analysisData.softSkillsPresent.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="bg-green-500/10 text-green-400 hover:bg-green-500/20">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No skills detected</p>
                      )}
                    </div>
                  </div>
                  <div className="skill-section">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Missing:</h4>
                    <div className="skill-tags flex flex-wrap gap-2">
                      {analysisData.softSkillsRequired?.length > 0 ? (
                        analysisData.softSkillsRequired
                          .filter(skill => !matchesSkill(skill, analysisData.softSkillsPresent || []))
                          .length > 0 ? (
                          analysisData.softSkillsRequired
                            .filter(skill => !matchesSkill(skill, analysisData.softSkillsPresent || []))
                            .map((skill, index) => (
                              <Badge key={index} variant="destructive" className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/30">
                                <FcCancel className="mr-1" /> {skill}
                              </Badge>
                            ))
                        ) : (
                          <p className="text-green-400 text-sm flex items-center">
                            <FcOk className="mr-2" /> All covered
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-slate-500">N/A</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div className="skill-card component-card" variants={itemVariants}>
              <Card className="bg-slate-800 border-slate-700 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-white">
                    <FcAreaChart /> Technical Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="skill-section">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Required:</h4>
                    <div className="skill-tags flex flex-wrap gap-2">
                      {analysisData.technicalSkillsRequired?.length > 0 ? (
                        analysisData.technicalSkillsRequired.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-slate-300 border-slate-600">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No specific requirements</p>
                      )}
                    </div>
                  </div>
                  <div className="skill-section">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Present:</h4>
                    <div className="skill-tags flex flex-wrap gap-2">
                      {analysisData.technicalSkillsPresent?.length > 0 ? (
                        analysisData.technicalSkillsPresent.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No skills detected</p>
                      )}
                    </div>
                  </div>
                  <div className="skill-section">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Missing:</h4>
                    <div className="skill-tags flex flex-wrap gap-2">
                      {analysisData.technicalSkillsRequired?.length > 0 ? (
                        analysisData.technicalSkillsRequired
                          .filter(skill => !matchesSkill(skill, analysisData.technicalSkillsPresent || []))
                          .length > 0 ? (
                          analysisData.technicalSkillsRequired
                            .filter(skill => !matchesSkill(skill, analysisData.technicalSkillsPresent || []))
                            .map((skill, index) => (
                              <Badge key={index} variant="destructive" className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/30">
                                <FcCancel className="mr-1" /> {skill}
                              </Badge>
                            ))
                        ) : (
                          <p className="text-green-400 text-sm flex items-center">
                            <FcOk className="mr-2" /> All covered
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-slate-500">N/A</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div className="recommendations-section" variants={itemVariants}>
            <h2 className="section-title">
              <FcIdea style={{ marginRight: '10px', fontSize: '2rem' }} />Recommendations
            </h2>
            <div className="recommendations-list space-y-4">
              {analysisData.recommendations?.length > 0 ? (
                analysisData.recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors">
                      <CardContent className="p-4 flex gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm shrink-0">
                          {index + 1}
                        </span>
                        <p className="text-slate-300">{rec}</p>
                      </CardContent>
                    </Card>
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

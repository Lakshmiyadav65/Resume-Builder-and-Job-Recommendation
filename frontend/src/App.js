import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ResumeBuilder from './pages/ResumeBuilder';
import RecruiterDashboard from './pages/RecruiterDashboard';
import RecruiterRanking from './pages/RecruiterRanking';
import AssignmentGenerator from './pages/AssignmentGenerator';
import ChatWithResume from './pages/ChatWithResume';
import DeepDive from './pages/DeepDive';
import PreparationPlan from './pages/PreparationPlan';

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
          <Route path="/recruiter-ranking" element={<RecruiterRanking />} />
          <Route path="/assignment-generator" element={<AssignmentGenerator />} />
          <Route path="/chat" element={<ChatWithResume />} />
          <Route path="/deep-dive" element={<DeepDive />} />
          <Route path="/preparation" element={<PreparationPlan />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;

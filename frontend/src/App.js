import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ResumeBuilder from './pages/ResumeBuilder';
import RecruiterDashboard from './pages/RecruiterDashboard';
import AssignmentGenerator from './pages/AssignmentGenerator';
import ChatWithResume from './pages/ChatWithResume';
import DeepDive from './pages/DeepDive';
import PreparationPlan from './pages/PreparationPlan';
import InterviewPage from './pages/InterviewPage';
import InterviewReport from './pages/InterviewReport';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/interview/:token" element={<InterviewPage />} />

            {/* Guest-accessible routes (AI Resume Analysis - candidate flow) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
            <Route path="/chat" element={<ChatWithResume />} />
            <Route path="/deep-dive" element={<DeepDive />} />
            <Route path="/preparation" element={<PreparationPlan />} />

            {/* Protected routes (Hiring Platform - requires login) */}
            <Route path="/recruiter-dashboard" element={<ProtectedRoute><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="/assignment-generator" element={<ProtectedRoute><AssignmentGenerator /></ProtectedRoute>} />
            <Route path="/interview-report" element={<ProtectedRoute><InterviewReport /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

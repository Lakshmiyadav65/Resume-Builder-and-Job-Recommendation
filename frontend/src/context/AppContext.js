import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || null;
  });
  
  const [userRole, setUserRole] = useState(() => {
    // Load userRole from localStorage on initialization
    return localStorage.getItem('userRole') || null;
  });
  
  const [analysisData, setAnalysisData] = useState(() => {
    const saved = localStorage.getItem('analysisData');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [resumeText, setResumeText] = useState(() => {
    return localStorage.getItem('resumeText') || null;
  });
  
  const [jobDescription, setJobDescription] = useState(() => {
    return localStorage.getItem('jobDescription') || null;
  });
  
  const [rankedCandidates, setRankedCandidates] = useState(() => {
    const saved = localStorage.getItem('rankedCandidates');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist sessionId to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }, [sessionId]);

  // Persist analysisData to localStorage
  useEffect(() => {
    if (analysisData) {
      localStorage.setItem('analysisData', JSON.stringify(analysisData));
    } else {
      localStorage.removeItem('analysisData');
    }
  }, [analysisData]);

  // Persist resumeText to localStorage
  useEffect(() => {
    if (resumeText) {
      localStorage.setItem('resumeText', resumeText);
    } else {
      localStorage.removeItem('resumeText');
    }
  }, [resumeText]);

  // Persist jobDescription to localStorage
  useEffect(() => {
    if (jobDescription) {
      localStorage.setItem('jobDescription', jobDescription);
    } else {
      localStorage.removeItem('jobDescription');
    }
  }, [jobDescription]);

  // Persist rankedCandidates to localStorage
  useEffect(() => {
    if (rankedCandidates && rankedCandidates.length > 0) {
      localStorage.setItem('rankedCandidates', JSON.stringify(rankedCandidates));
    } else {
      localStorage.removeItem('rankedCandidates');
    }
  }, [rankedCandidates]);

  // Persist userRole to localStorage whenever it changes
  const updateUserRole = (role) => {
    setUserRole(role);
    if (role) {
      localStorage.setItem('userRole', role);
    } else {
      localStorage.removeItem('userRole');
    }
  };

  const resetSession = () => {
    setSessionId(null);
    setAnalysisData(null);
    setResumeText(null);
    setJobDescription(null);
    setRankedCandidates([]);
    localStorage.removeItem('sessionId');
    localStorage.removeItem('analysisData');
    localStorage.removeItem('resumeText');
    localStorage.removeItem('jobDescription');
    localStorage.removeItem('rankedCandidates');
  };

  const value = {
    sessionId,
    setSessionId,
    userRole,
    setUserRole: updateUserRole,
    analysisData,
    setAnalysisData,
    resumeText,
    setResumeText,
    jobDescription,
    setJobDescription,
    rankedCandidates,
    setRankedCandidates,
    resetSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

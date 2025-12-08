import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Analysis APIs
export const analyzeResume = async (formData) => {
  const response = await api.post('/analysis/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getAnalysis = async (sessionId) => {
  const response = await api.get(`/analysis/${sessionId}`);
  return response.data;
};

// Chat APIs
export const initChat = async (formData) => {
  const response = await api.post('/chat/init', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const sendChatMessage = async (sessionId, message) => {
  const response = await api.post('/chat/message', { sessionId, message });
  return response.data;
};

export const getChatHistory = async (sessionId) => {
  const response = await api.get(`/chat/${sessionId}`);
  return response.data;
};

export const clearChat = async (sessionId) => {
  const response = await api.delete(`/chat/${sessionId}`);
  return response.data;
};

// Preparation Plan APIs
export const generatePrepPlan = async (sessionId, days) => {
  const response = await api.post('/prep-plan/generate', { sessionId, days });
  return response.data;
};

export const getPrepPlans = async (sessionId) => {
  const response = await api.get(`/prep-plan/${sessionId}`);
  return response.data;
};

// Recruiter Mode APIs
export const rankResumes = async (formData) => {
  const response = await api.post('/recruiter/rank-resumes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const generateAssignments = async (data) => {
  const response = await api.post('/recruiter/generate-assignments', data);
  return response.data;
};

export default api;

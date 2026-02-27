const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');

dotenv.config();

const app = express();
// Using Groq API (Llama 3.3-70B) for AI-powered resume analysis


app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const mongoUri = process.env.MONGODB_URI;
if (!mongoUri || mongoUri.includes('localhost')) {
  console.warn('⚠️  WARNING: MONGODB_URI is not set or pointing to localhost. This will fail on Vercel! Set a MongoDB Atlas URI in your environment variables.');
}

mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));


const analysisRoutes = require('./routes/analysis');
const chatRoutes = require('./routes/chat');
const prepPlanRoutes = require('./routes/prepPlan');
const recruiterRoutes = require('./routes/recruiter');
const resumeBuilderRoutes = require('./routes/resumeBuilder');
const interviewRoutes = require('./routes/interview');

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Use Routes
app.use('/api/analysis', analysisRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/prep-plan', prepPlanRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/resume-builder', resumeBuilderRoutes);
app.use('/api/interview', interviewRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ATScribe API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Catch all other routes and return the index.html from frontend build
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Export the app for Vercel serverless deployment
module.exports = app;

// Start server only when running locally (not in Vercel serverless environment)
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

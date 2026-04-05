const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet — sets secure HTTP headers (XSS, clickjacking, MIME sniffing protection)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disabled for React SPA compatibility
}));

// CORS — restrict origins in production
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000']
  : ['http://localhost:3000'];

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? allowedOrigins
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — prevent brute force and abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again after 15 minutes.',
  },
});

// Stricter rate limit for AI-heavy endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 AI requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI request limit reached. Please try again after 15 minutes.',
  },
});

// Apply general rate limit to all API routes
app.use('/api/', apiLimiter);

// ===========================================
// REQUEST PARSING & LOGGING
// ===========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan — HTTP request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// ===========================================
// DATABASE CONNECTION
// ===========================================

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI is not set. Please configure it in .env');
  process.exit(1);
}

if (mongoUri.includes('localhost') && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: MONGODB_URI points to localhost in production. Use MongoDB Atlas URI.');
}

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    if (process.env.NODE_ENV !== 'production') process.exit(1);
  });

// ===========================================
// STATIC FILES
// ===========================================

app.use(express.static(path.join(__dirname, '../frontend/build')));

// ===========================================
// API ROUTES
// ===========================================

const analysisRoutes = require('./routes/analysis');
const chatRoutes = require('./routes/chat');
const prepPlanRoutes = require('./routes/prepPlan');
const recruiterRoutes = require('./routes/recruiter');
const resumeBuilderRoutes = require('./routes/resumeBuilder');
const interviewRoutes = require('./routes/interview');

// Apply stricter rate limit to AI-heavy routes
app.use('/api/analysis', aiLimiter, analysisRoutes);
app.use('/api/chat', aiLimiter, chatRoutes);
app.use('/api/prep-plan', aiLimiter, prepPlanRoutes);
app.use('/api/recruiter', aiLimiter, recruiterRoutes);
app.use('/api/resume-builder', resumeBuilderRoutes);
app.use('/api/interview', aiLimiter, interviewRoutes);

// ===========================================
// HEALTH CHECK & API INFO
// ===========================================

const startTime = Date.now();

app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';

  res.json({
    status: dbState === 1 ? 'healthy' : 'degraded',
    service: 'ATScribe API',
    version: '1.0.0',
    uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      analysis: '/api/analysis',
      chat: '/api/chat',
      prepPlan: '/api/prep-plan',
      recruiter: '/api/recruiter',
      resumeBuilder: '/api/resume-builder',
      interview: '/api/interview',
    },
  });
});

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
});

// SPA fallback — serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      message: 'Maximum file size is 10MB',
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: Object.values(err.errors).map(e => e.message).join(', '),
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
  }

  // Default 500
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ===========================================
// SERVER START
// ===========================================

module.exports = app;

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

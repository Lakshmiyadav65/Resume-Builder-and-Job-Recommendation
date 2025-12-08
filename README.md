# ATScribe - AI-Powered Resume Analysis Platform

<div align="center">

![ATScribe Logo](https://img.shields.io/badge/ATScribe-AI%20Resume%20Analysis-6366f1?style=for-the-badge)

## 🚀 Live Demo

**Frontend**: https://atscribe-frontend-production.up.railway.app  
**Backend**: https://atscribe-backend-production.up.railway.app/api/health

## 📌 Quick Links

- [GitHub Repository](https://github.com/Lakshmiyadav65/Resume-Builder)
- [Documentation](./PROJECT_OVERVIEW.md)
- [Deployment Guide](./DEPLOYMENT.md)

**Modern MERN Stack Application with AI-Powered Resume Analysis**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Groq AI](https://img.shields.io/badge/Groq-AI%20Powered-ff4d4d?style=flat)](https://groq.com/)

</div>

---

## 🌟 Features

### 🎯 Core Functionality
- **AI-Powered Resume Analysis**: Upload resumes and get comprehensive AI-driven analysis
- **Job Description Matching**: Compare resumes against job descriptions with detailed scoring
- **Interactive Chat**: Ask questions about your resume using AI
- **Skills Gap Analysis**: Identify missing skills and areas for improvement
- **Preparation Plans**: Generate personalized study plans based on your timeline

### 🎨 Modern UI/UX
- **Beautiful Animations**: Smooth transitions with Framer Motion
- **Dark Theme**: Professional dark mode design
- **Responsive Design**: Works seamlessly on all devices
- **Interactive Elements**: Hover effects, zoom animations, and smooth transitions
- **Gradient Backgrounds**: Modern gradient orbs and effects

### 👥 Dual User Modes
- **Student Mode**: Perfect for job seekers improving their resumes
- **Recruiter Mode**: Efficiently analyze candidate resumes

---

## 🏗️ Tech Stack

### Frontend
- **React 18.3**: Modern React with hooks
- **Framer Motion**: Smooth animations and transitions
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **React Circular Progressbar**: Beautiful circular gauges
- **React Markdown**: Render markdown content

### Backend
- **Node.js & Express**: RESTful API server
- **MongoDB & Mongoose**: Database and ODM
- **GROQ**: Advanced AI analysis
- **Multer**: File upload handling
- **PDF-Parse**: Extract text from PDF resumes

---

## 📁 Project Structure

```
capstone/
├── frontend/                  # React frontend application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── Sidebar.js
│   │   │   ├── Sidebar.css
│   │   │   ├── CircularGauge.js
│   │   │   └── CircularGauge.css
│   │   ├── pages/            # Page components
│   │   │   ├── LandingPage.js
│   │   │   ├── LandingPage.css
│   │   │   ├── Dashboard.js
│   │   │   ├── Dashboard.css
│   │   │   ├── ChatWithResume.js
│   │   │   ├── ChatWithResume.css
│   │   │   ├── DeepDive.js
│   │   │   ├── DeepDive.css
│   │   │   ├── PreparationPlan.js
│   │   │   └── PreparationPlan.css
│   │   ├── context/          # React Context
│   │   │   └── AppContext.js
│   │   ├── services/         # API services
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── .env
│
├── backend/                   # Express backend API
│   ├── models/               # MongoDB models
│   │   ├── Analysis.js
│   │   ├── Chat.js
│   │   └── PrepPlan.js
│   ├── routes/               # API routes
│   │   ├── analysis.js
│   │   ├── chat.js
│   │   └── prepPlan.js
│   ├── server.js             # Main server file
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/)

### Installation

#### 1. Clone the Repository
```bash
cd Resume-Builder
```

#### 2. Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (already created with your API key)
# Make sure .env contains:
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/atscribe
# GROQ_API_KEY=your_gemini_api_key_here
# NODE_ENV=development

# Start MongoDB (if not running as service)
# On Windows: Start MongoDB from Services or run mongod

# Start the backend server
npm run dev
# Or for production:
# npm start
```

The backend server will start on `http://localhost:5000`

#### 3. Setup Frontend

Open a **new terminal** window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file (already created)
# Make sure .env contains:
# REACT_APP_API_URL=http://localhost:5000/api

# Start the frontend development server
npm start
```

The frontend will open automatically at `http://localhost:3000`

---

## 🎮 Usage Guide

### 1. Landing Page
- Choose your role: **Student** or **Recruiter**
- Experience smooth animations and modern UI
- Click on your role card to proceed to the dashboard

### 2. Dashboard
- **Upload Resume**: Drag and drop or click to upload PDF resume
- **Enter Job Description**: Paste the job description in the text area
- **Start Analysis**: Click to analyze with AI
- **View Results**: See overall match score, skill match score, and detailed feedback
- **Navigate**: Access Chat, Deep Dive, or Preparation Plan

### 3. Chat with Resume
- Upload your resume (if not already analyzed)
- Ask questions about your resume
- Get AI-powered detailed responses
- Clear chat history anytime

### 4. Deep Dive Report
- View comprehensive skills gap analysis
- See missing vs present skills (soft & technical)
- Get tailored recommendations
- Review extra insights and metrics

### 5. Preparation Plan
- Enter number of days for preparation
- Use quick select buttons (7, 14, 30, 60, 90 days)
- Generate AI-powered personalized study plan
- Download plan as markdown file

---

## 🔌 API Endpoints

### Analysis Routes
- `POST /api/analysis/analyze` - Analyze resume against job description
- `GET /api/analysis/:sessionId` - Retrieve analysis results

### Chat Routes
- `POST /api/chat/init` - Initialize chat with resume
- `POST /api/chat/message` - Send message to chat
- `GET /api/chat/:sessionId` - Get chat history
- `DELETE /api/chat/:sessionId` - Clear chat history

### Preparation Plan Routes
- `POST /api/prep-plan/generate` - Generate preparation plan
- `GET /api/prep-plan/:sessionId` - Get preparation plans

---

## 🎨 Design Features

### Animations
- **Framer Motion**: Smooth page transitions and element animations
- **Hover Effects**: Interactive buttons and cards
- **Loading States**: Elegant spinners and progress indicators
- **Stagger Animations**: Sequential element reveals

### Color Scheme
- **Primary**: Indigo (#6366f1) to Purple (#8b5cf6)
- **Secondary**: Pink (#ec4899) to Rose (#f43f5e)
- **Background**: Dark gradient (#0f1419 to #1a1f2e)
- **Accents**: Blue, Green, and Red for statuses

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 300-900 for various hierarchies
- **Sizes**: Responsive scaling for all devices

---

## 🔧 Configuration

### Backend Environment Variables (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/atscribe
GROQ_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

### Frontend Environment Variables (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm test
```

---

## 📦 Building for Production

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
```

The build folder will contain optimized production files.

---

## 🚢 Deployment

### 🚀 Live Demo

**Coming Soon**: Deployed on Railway

### Quick Deploy to Railway

See detailed deployment guide: [`DEPLOYMENT.md`](./DEPLOYMENT.md)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/Lakshmiyadav65/Resume-Builder.git
git push -u origin main

# 2. Deploy on Railway
# Go to https://railway.app
# Login with GitHub → New Project → Deploy from GitHub
# Select: atscribe-ai-resume-analyzer
# Configure backend & frontend services
```

**GitHub Repository**: https://github.com/Lakshmiyadav65/Resume-Builder

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Lakshmi**
- Project: ATScribe - AI Resume Analysis Platform

---

## 🙏 Acknowledgments

- **GROQ AI** for powerful AI capabilities
- **React Team** for the amazing frontend library
- **Framer Motion** for smooth animations
- **MongoDB** for flexible database solution

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the console logs (Frontend: Browser DevTools, Backend: Terminal)
2. Ensure MongoDB is running
3. Verify environment variables are set correctly
4. Check API endpoints are accessible

---

## 🎯 Future Enhancements

- [ ] Multiple resume format support (DOCX, TXT)
- [ ] Batch resume analysis for recruiters
- [ ] Resume template suggestions
- [ ] Skills trending analysis
- [ ] Interview question generator
- [ ] Resume version comparison
- [ ] Email notifications
- [ ] Advanced analytics dashboard

---

<div align="center">


⭐ Star this repo if you find it helpful!

</div>

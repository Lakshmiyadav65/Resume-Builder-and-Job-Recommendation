import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FaGraduationCap, FaBriefcase, FaArrowRight, FaSlack, FaTrello, FaSalesforce, FaMicrosoft } from 'react-icons/fa';
import { SiZoom, SiCalendly, SiGooglemeet, SiNotion, SiJira, SiAsana, SiHubspot, SiGmail } from 'react-icons/si';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { setUserRole } = useApp();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  // Preload critical images
  useEffect(() => {
    const imagesToPreload = [
      '/images/Group 5.png',
      '/images/hero-globe.png',
      '/logo.png'
    ];

    let loadedCount = 0;
    const totalImages = imagesToPreload.length;

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === 1) {
          // Background loaded (most critical)
          setBackgroundLoaded(true);
        }
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === 1) {
          setBackgroundLoaded(true);
        }
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });

    // Fallback timeout
    const timeout = setTimeout(() => {
      setBackgroundLoaded(true);
      setImagesLoaded(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const handleRoleSelection = (role) => {
    setUserRole(role);
    if (role === 'recruiter') {
      navigate('/recruiter-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
      },
    },
    hover: {
      scale: 1.05,
      y: -10,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <div className="landing-page">
      {/* Loading overlay */}
      {!backgroundLoaded && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading ATScribe...</p>
        </div>
      )}

      {/* Hero Section */}
      <motion.section
        className={`hero-section ${backgroundLoaded ? 'loaded' : 'loading'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: backgroundLoaded ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <nav className="hero-nav">
          <div className="logo-container">
            <img src="/logo.png" alt="ATSCRIBE" className="logo" />
          </div>
          <Button
            className="get-started-btn bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-medium transition-all"
            onClick={() => document.getElementById('role-selection').scrollIntoView({ behavior: 'smooth' })}
          >
            Get Started
          </Button>
        </nav>

        <div className="hero-content">
          <div className="hero-center-content">
            <motion.div
              className="hero-text"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <Badge variant="secondary" className="hero-badge mb-6 px-4 py-2 text-sm font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-full inline-block">
                AI-Driven Talent Screening & Career Growth Platform
              </Badge>
              <h1 className="hero-title">
                Transforming How Talent<br />
                Is Discovered & Hired
              </h1>
              <p className="hero-subtitle">
                Let AI analyze, filter, and score resumes based on job requirements so you<br />
                only spend time interviewing the most promising talent
              </p>
            </motion.div>

            <motion.div
              className="hero-visual"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              <div className="globe-container">
                <img
                  src="/images/hero-globe.png"
                  alt="AI Platform"
                  className={`globe-image ${imagesLoaded ? 'loaded' : ''}`}
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Role Selection Section */}
      <motion.div
        id="role-selection"
        className="landing-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="welcome-section" variants={itemVariants}>
          <h2 className="welcome-title">How Would You Like to Continue?</h2>
        </motion.div>

        <motion.div className="role-cards" variants={itemVariants}>

          <motion.div
            className="role-card student-card"
            variants={cardVariants}
            whileHover="hover"
            onClick={() => handleRoleSelection('student')}
          >
            <div className="card-image-bg">
              <img
                src="/images/student-image.png"
                alt="Student"
                loading="lazy"
              />
            </div>

            <div className="card-icon-badge">
              <FaGraduationCap />
            </div>

            <div className="card-content">
              <h3 className="card-title">I am a Student</h3>
              <p className="card-description">
                Explore opportunities, build your profile, and connect with recruiters
              </p>

              <div className="card-button-wrapper">
                <Button
                  className="card-button student-button w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  Continue <FaArrowRight className="arrow-icon" />
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="role-card recruiter-card"
            variants={cardVariants}
            whileHover="hover"
            onClick={() => handleRoleSelection('recruiter')}
          >
            <div className="card-image-bg">
              <img
                src="/images/recruiter-image.png"
                alt="Recruiter"
                loading="lazy"
              />
            </div>

            <div className="card-icon-badge">
              <FaBriefcase />
            </div>

            <div className="card-content">
              <h3 className="card-title">I am a Recruiter</h3>
              <p className="card-description">
                Find top talent, post opportunities, and manage your hiring pipeline
              </p>

              <div className="card-button-wrapper">
                <Button
                  className="card-button recruiter-button w-full gap-2 bg-pink-600 hover:bg-pink-700"
                >
                  Continue <FaArrowRight className="arrow-icon" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Tools Integration Section */}
        <motion.div
          className="tools-section-new"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Top Arc Icons */}
          <div className="tools-arc-wrapper">
            <div className="tools-arc">
              <div className="arc-icon icon-1"><SiZoom /></div>
              <div className="arc-icon icon-2"><FaSlack /></div>
              <div className="arc-icon icon-3"><FaMicrosoft /></div>
              <div className="arc-icon icon-4"><SiGooglemeet /></div>
              <div className="arc-icon icon-5"><SiCalendly /></div>
              <div className="arc-icon icon-6"><FaSalesforce /></div>
              <div className="arc-icon icon-7"><SiNotion /></div>
              <div className="arc-icon icon-8"><SiHubspot /></div>
              <div className="arc-icon icon-9"><SiJira /></div>
              <div className="arc-icon icon-10"><SiAsana /></div>
              <div className="arc-icon icon-11"><SiGmail /></div>
              <div className="arc-icon icon-12"><FaTrello /></div>
            </div>
          </div>

          <div className="tools-text-group">
            <h3 className="tools-subtitle-top">
              Works with your existing ATS,<br />
              CRM, scheduling, phone,<br />
              and video conferencing tools
            </h3>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
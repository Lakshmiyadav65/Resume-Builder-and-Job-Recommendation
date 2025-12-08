import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { FaLinkedin, FaWhatsapp, FaMicrosoft, FaGraduationCap, FaBriefcase, FaArrowRight } from 'react-icons/fa';
import { SiZoom, SiGooglecalendar, SiCalendly, SiGooglemeet } from 'react-icons/si';
import { BsStars, BsMicrosoftTeams } from 'react-icons/bs';
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
          <motion.button
            className="get-started-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('role-selection').scrollIntoView({ behavior: 'smooth' })}
          >
            Get Started
          </motion.button>
        </nav>

        <div className="hero-content">
          <div className="hero-center-content">
            <motion.div
              className="hero-text"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <div className="hero-badge">
                AI-Driven Talent Screening & Career Growth Platform
              </div>
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
                <motion.button
                  className="card-button student-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Continue <FaArrowRight className="arrow-icon" />
                </motion.button>
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
                <motion.button
                  className="card-button recruiter-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Continue <FaArrowRight className="arrow-icon" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Smaya Section */}


        {/* Tools Integration Section */}
        <motion.div
          className="tools-section"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="tools-arch-container">
            {/* Arch Line Removed */}

            {/* Icons Removed */}

            {/* Central Hub Icon */}
            <div className="central-hub">
              <div className="hub-icon">
                <div className="hub-inner-icon">
                  <span className="hub-text">ATS</span>
                </div>
              </div>
              <div className="hub-ripple"></div>
              <div className="hub-ripple delay-1"></div>
            </div>
          </div>

          <div className="tools-content">
            <h2 className="tools-title">
              Connect With The<br />
              Tools <span className="text-gray">You Already Use Daily</span>
            </h2>
            <p className="tools-subtitle">
              Effortlessly integrate with your favorite platforms with<br />
              all in one unified hiring experience.
            </p>
            <motion.button
              className="tools-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
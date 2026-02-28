import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FcBarChart,
  FcVoicePresentation,
  FcSearch,
  FcCalendar,
  FcTodoList,
  FcVip,
} from 'react-icons/fc';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, setUserRole } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  // Determine role based on current route if userRole is not set
  React.useEffect(() => {
    if (!userRole) {
      const recruiterRoutes = ['/recruiter-dashboard', '/recruiter-ranking', '/assignment-generator'];
      const isRecruiterRoute = recruiterRoutes.some(route => location.pathname.startsWith(route));
      if (isRecruiterRoute) {
        setUserRole('recruiter');
      } else if (location.pathname !== '/' && !location.pathname.startsWith('/hr-dashboard')) {
        setUserRole('student');
      }
    }
  }, [location.pathname, userRole, setUserRole]);

  const studentMenuItems = [
    { path: '/dashboard', icon: FcBarChart, label: 'Dashboard' },
    { path: '/chat', icon: FcVoicePresentation, label: 'Chat with Resume' },
    { path: '/deep-dive', icon: FcSearch, label: 'Deep Dive' },
    { path: '/preparation', icon: FcCalendar, label: 'Preparation Plan' },
  ];

  const recruiterMenuItems = [
    { path: '/recruiter-dashboard', icon: FcBarChart, label: 'Dashboard' },
    { path: '/recruiter-dashboard?tab=rank', icon: FcVip, label: 'Rank Resumes' },
    { path: '/assignment-generator', icon: FcTodoList, label: 'Assignment Ideas' },
  ];

  let menuItems = studentMenuItems;
  if (userRole === 'recruiter') menuItems = recruiterMenuItems;

  return (
    <>
      {/* Collapsed sidebar — strip with toggle button */}
      <div className={`sidebar-collapsed ${isOpen ? 'sidebar-hidden' : ''}`}>
        {/* Logo icon */}
        <div className="sidebar-collapsed-logo" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="ATScribe" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px' }} />
        </div>

        {/* Nav icons */}
        <div className="sidebar-collapsed-nav">
          {menuItems.map((item) => {
            const isActive = (location.pathname + location.search) === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`sidebar-icon-btn ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <item.icon style={{ fontSize: '22px' }} />
              </button>
            );
          })}
        </div>

        {/* Open arrow */}
        <button className="sidebar-toggle-btn" onClick={() => setIsOpen(true)} title="Open Sidebar">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Expanded sidebar overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="sidebar-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Expanded sidebar panel */}
            <motion.div
              className="sidebar-expanded"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="sidebar-expanded-header">
                <img src="/logo.png" alt="ATScribe" className="sidebar-logo cursor-pointer" onClick={() => { navigate('/'); setIsOpen(false); }} />
                <button className="sidebar-close-btn" onClick={() => setIsOpen(false)}>✕</button>
              </div>

              {/* Nav items */}
              <div className="sidebar-expanded-nav">
                {menuItems.map((item) => {
                  const isActive = (location.pathname + location.search) === item.path;
                  return (
                    <button
                      key={item.path}
                      className={`sidebar-expanded-item ${isActive ? 'active' : ''}`}
                      onClick={() => { navigate(item.path); setIsOpen(false); }}
                    >
                      <item.icon style={{ fontSize: '22px', flexShrink: 0 }} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;

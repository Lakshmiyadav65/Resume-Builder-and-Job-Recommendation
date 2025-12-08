import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcBarChart, FcVoicePresentation, FcSearch, FcCalendar, FcNightPortrait, FcTodoList, FcVip } from 'react-icons/fc';
import { useApp } from '../context/AppContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, setUserRole } = useApp();

  // Determine role based on current route if userRole is not set
  React.useEffect(() => {
    if (!userRole) {
      const recruiterRoutes = ['/recruiter-dashboard', '/recruiter-ranking', '/assignment-generator'];
      const isRecruiterRoute = recruiterRoutes.some(route => location.pathname.startsWith(route));
      
      if (isRecruiterRoute) {
        setUserRole('recruiter');
      } else if (location.pathname !== '/') {
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
    { path: '/recruiter-ranking', icon: FcVip, label: 'Rank Resumes' },
    { path: '/assignment-generator', icon: FcTodoList, label: 'Assignment Ideas' },
  ];

  const menuItems = userRole === 'recruiter' ? recruiterMenuItems : studentMenuItems;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/logo.png" alt="ATSCRIBE" className="sidebar-logo" onClick={() => navigate('/')} />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <motion.div
            key={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.98 }}
          >
            <item.icon className="sidebar-icon" style={{ fontSize: '1.5rem' }} />
            <span className="sidebar-label">{item.label}</span>
          </motion.div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="dark-mode-toggle">
          <FcNightPortrait className="sidebar-icon" style={{ fontSize: '1.5rem' }} />
          <span>Dark Mode</span>
          <div className="toggle-switch active">
            <div className="toggle-thumb"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

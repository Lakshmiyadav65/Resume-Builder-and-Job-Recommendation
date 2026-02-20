import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcBarChart, FcVoicePresentation, FcSearch, FcCalendar, FcNightPortrait, FcTodoList, FcVip } from 'react-icons/fc';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { useApp } from '../context/AppContext';
import { useState } from 'react';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, setUserRole } = useApp();
  const [darkMode, setDarkMode] = useState(true);

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

      <nav className="sidebar-nav px-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.path}
            variant={location.pathname === item.path ? "secondary" : "ghost"}
            className={`w-full justify-start gap-4 text-left font-normal h-12 ${location.pathname === item.path ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon className="text-2xl" />
            <span className="text-sm font-medium">{item.label}</span>
          </Button>
        ))}
      </nav>

      <div className="sidebar-footer p-4 border-t border-slate-800">
        <div className="dark-mode-toggle flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-slate-400">
            <FcNightPortrait className="text-2xl" />
            <span className="text-sm font-medium">Dark Mode</span>
          </div>
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

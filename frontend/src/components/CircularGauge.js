import React from 'react';
import { motion } from 'framer-motion';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './CircularGauge.css';

const CircularGauge = ({ label, value, color }) => {
  return (
    <motion.div
      className="gauge-container"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      <div className="gauge-wrapper">
        <CircularProgressbar
          value={value}
          text={`${Math.round(value)}%`}
          styles={buildStyles({
            pathColor: color || '#9448C4',
            textColor: '#ffffff',
            trailColor: 'rgba(99, 102, 241, 0.1)',
            pathTransitionDuration: 1.5,
            textSize: '20px',
          })}
        />
      </div>
      <h3 className="gauge-label">{label}</h3>
    </motion.div>
  );
};

export default CircularGauge;

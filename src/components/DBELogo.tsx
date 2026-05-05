import React from 'react';
import logoDbe from '../assets/logo-dbe.png';

const DBELogo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img src={logoDbe} alt="DBE" className="h-full w-auto object-contain" />
    </div>
  );
};

export default DBELogo;

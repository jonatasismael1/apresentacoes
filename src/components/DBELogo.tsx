import React from 'react';

const DBELogo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img src="/logo-dbe.png" alt="DBE" className="h-full w-auto object-contain" />
    </div>
  );
};

export default DBELogo;

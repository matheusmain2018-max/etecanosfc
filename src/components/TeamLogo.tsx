import React from 'react';

interface TeamLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function TeamLogo({ className = '', size = 'md' }: TeamLogoProps) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  return (
    <div className={`relative flex items-center justify-center ${sizes[size]} ${className}`}>
      {/* Decorative pulse background representing official white and light-blue energy */}
      <span className="absolute inset-0 rounded-full bg-sky-200/50 animate-pulse" />
      
      {/* Official Clun Logo Image */}
      <img
        src="https://i.imgur.com/gLgiJ2x.png"
        alt="ETECANOS FC"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain relative z-10 drop-shadow-md select-none"
      />
    </div>
  );
}

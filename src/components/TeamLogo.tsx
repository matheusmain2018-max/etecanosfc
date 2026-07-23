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
      {/* Decorative pulse background representing official team colors: gold and navy/red */}
      <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-pulse" />
      
      {/* Official Club Logo Image */}
      <img
        src="/logo.png"
        alt="BILAU LOMBRADO FC"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover rounded-2xl relative z-10 drop-shadow-md select-none border border-amber-500/30"
      />
    </div>
  );
}

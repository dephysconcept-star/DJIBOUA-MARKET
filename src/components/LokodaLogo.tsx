import React from 'react';

interface LokodaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
  showTagline?: boolean;
}

export const LokodaLogo: React.FC<LokodaLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'color',
  showTagline = false,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const textColor = variant === 'light' ? 'text-white' : 'text-blue-950';
  const accentColor = 'text-amber-500';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Majestic Elephant Emblem */}
      <div className={`relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-blue-900 via-blue-800 to-amber-600 p-1.5 shadow-md shadow-blue-950/20 ring-1 ring-amber-400/40 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-amber-400 drop-shadow"
        >
          {/* Elephant Silhouette stylized */}
          <path
            d="M12 36V28C12 25 10 24 9 22C8 20 8 16 11 13C14 10 19 9 25 9C32 9 37 12 39 17C40 20 40 24 37 27C35 29 33 29 33 32V36"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Elephant Ear */}
          <path
            d="M26 12C26 12 30 14 31 18C32 22 29 26 25 26C21 26 21 21 22 18"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Elephant Eye */}
          <circle cx="18" cy="17" r="1.8" fill="#FBBF24" />
          {/* Elephant Trunk curve */}
          <path
            d="M12 21C9 21 6 23 5 26C4 29 6 32 8 32C10 32 11 30 11 28"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Tusk in Gold/White */}
          <path
            d="M14 24C12 25 11 27 12 29C13 31 16 30 16 28"
            stroke="#FEF08A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Legs & Ground indicator */}
          <line x1="17" y1="36" x2="17" y2="39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="23" y1="36" x2="23" y2="39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="29" y1="36" x2="29" y2="39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="35" y1="36" x2="35" y2="39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <div className={`font-black tracking-tight font-sans flex items-baseline ${textSizes[size]}`}>
          <span className={textColor}>DJIBOUA</span>
          <span className={`ml-1 font-extrabold ${accentColor}`}>MARKET</span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase mt-0.5">
            Divo • Lakota • Gagnoa • Guitry
          </span>
        )}
      </div>
    </div>
  );
};

import React from 'react';

interface PavingAnimationProps {
  step: number;
}

export const PavingAnimation: React.FC<PavingAnimationProps> = ({ step }) => {
  return (
    <>
      <div className="relative w-24 h-24 text-slate-600 dark:text-slate-300">
        {/* Step 0: Analysis Grid/Scanline */}
        <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${step === 0 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-2 border-2 border-current/30 rounded-lg animate-pulse"></div>
          <div className="absolute w-px h-full top-0 bg-current/50 left-[25%] animate-grid-line"></div>
          <div className="absolute w-px h-full top-0 bg-current/50 left-[50%] animate-grid-line" style={{ animationDelay: '150ms' }}></div>
          <div className="absolute w-px h-full top-0 bg-current/50 left-[75%] animate-grid-line" style={{ animationDelay: '300ms' }}></div>
          <div className="absolute h-px w-full left-0 bg-current/50 top-[25%] animate-grid-line" style={{ animationDelay: '450ms' }}></div>
          <div className="absolute h-px w-full left-0 bg-current/50 top-[50%] animate-grid-line" style={{ animationDelay: '600ms' }}></div>
          <div className="absolute h-px w-full left-0 bg-current/50 top-[75%] animate-grid-line" style={{ animationDelay: '750ms' }}></div>
        </div>

        {/* Step 1: Applying Texture */}
        <div className={`absolute inset-2 grid grid-cols-4 grid-rows-4 gap-px transition-opacity duration-500 ease-in-out ${step === 1 ? 'opacity-100' : 'opacity-0'}`}>
          {[...Array(16)].map((_, i) => (
            <div 
              key={i} 
              className="bg-current/60 rounded-sm animate-tile-fill" 
              style={{ animationDelay: `${(i % 4 * 100) + Math.floor(i / 4) * 100}ms` }}
            />
          ))}
        </div>

        {/* Step 2: Lighting */}
        <div className={`absolute inset-2 rounded-lg bg-current/20 overflow-hidden transition-opacity duration-500 ease-in-out ${step === 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/20 via-white/0 to-white/0 dark:from-white/10 dark:via-white/0 animate-light-sweep"></div>
        </div>

        {/* Step 3: Polishing */}
        <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${step === 3 ? 'opacity-100' : 'opacity-0'}`}>
           <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 35L52.5 47.5L65 50L52.5 52.5L50 65L47.5 52.5L35 50L47.5 47.5L50 35Z" className="fill-current opacity-80 animate-sparkle" style={{ transformOrigin: '50px 50px', animationDelay: '0s' }}/>
            <path d="M80 15L81.5 21.5L88 23L81.5 24.5L80 31L78.5 24.5L72 23L78.5 21.5L80 15Z" className="fill-current opacity-80 animate-sparkle" style={{ transformOrigin: '80px 23px', animationDelay: '0.4s' }}/>
            <path d="M20 75L21.5 81.5L28 83L21.5 84.5L20 91L18.5 84.5L12 83L18.5 81.5L20 75Z" className="fill-current opacity-80 animate-sparkle" style={{ transformOrigin: '20px 83px', animationDelay: '0.8s' }} />
           </svg>
        </div>
      </div>
      <style>{`
        @keyframes grid-line {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-grid-line { animation: grid-line 0.5s ease-out forwards; }
        
        @keyframes tile-fill {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-tile-fill {
            opacity: 0;
            animation: tile-fill 0.4s ease-out forwards;
        }

        @keyframes light-sweep {
            from { transform: translateX(-100%) translateY(-100%) rotate(-45deg); }
            to { transform: translateX(100%) translateY(100%) rotate(-45deg); }
        }
        .animate-light-sweep { animation: light-sweep 2s ease-in-out infinite; }

        @keyframes sparkle {
            0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
            50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
        }
        .animate-sparkle { 
            opacity: 0;
            animation: sparkle 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

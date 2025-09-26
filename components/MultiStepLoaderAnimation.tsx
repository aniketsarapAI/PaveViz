
import React from 'react';

interface MultiStepLoaderAnimationProps {
  step: number;
}

// A helper to manage the fade-in/fade-out logic and prevent overlapping animations.
const AnimationContainer: React.FC<{ isActive: boolean; children: React.ReactNode }> = ({ isActive, children }) => (
  <div className={`absolute inset-0 transition-opacity duration-200 ${isActive ? 'opacity-100 animate-elegant-fade-in' : 'opacity-0 pointer-events-none'}`}>
    {children}
  </div>
);

export const MultiStepLoaderAnimation: React.FC<MultiStepLoaderAnimationProps> = ({ step }) => {
  return (
    <>
      <div className="relative w-28 h-28">
        {/* Step 0: Analyzing */}
        <AnimationContainer isActive={step === 0}>
          <div className="w-full h-full animate-magnify-move">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="40" cy="40" r="20" stroke="#c68f5c" strokeWidth="4" fill="none" />
              <line x1="54" y1="54" x2="70" y2="70" stroke="#c68f5c" strokeWidth="6" strokeLinecap="round" />
              <circle cx="40" cy="40" r="16" fill="#d3c9b8" fillOpacity="0.3" />
            </svg>
          </div>
        </AnimationContainer>

        {/* Step 1: Applying */}
        <AnimationContainer isActive={step === 1}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
                <rect id="paving-tile" width="28" height="28" rx="2" fill="#d3c9b8" stroke="#8d8c8a" strokeWidth="1"/>
            </defs>
            
            {/* Animate tiles laying down in sequence */}
            <use href="#paving-tile" x="5" y="5" className="animate-lay-tile" style={{ animationDelay: '0s' }} />
            <use href="#paving-tile" x="36" y="5" className="animate-lay-tile" style={{ animationDelay: '0.15s' }} />
            <use href="#paving-tile" x="67" y="5" className="animate-lay-tile" style={{ animationDelay: '0.3s' }} />

            <use href="#paving-tile" x="5" y="36" className="animate-lay-tile" style={{ animationDelay: '0.25s' }} />
            <use href="#paving-tile" x="36" y="36" className="animate-lay-tile" style={{ animationDelay: '0.4s' }} />
            <use href="#paving-tile" x="67" y="36" className="animate-lay-tile" style={{ animationDelay: '0.55s' }} />

            <use href="#paving-tile" x="5" y="67" className="animate-lay-tile" style={{ animationDelay: '0.5s' }} />
            <use href="#paving-tile" x="36" y="67" className="animate-lay-tile" style={{ animationDelay: '0.65s' }} />
            <use href="#paving-tile" x="67" y="67" className="animate-lay-tile" style={{ animationDelay: '0.8s' }} />
          </svg>
        </AnimationContainer>
        
        {/* Step 2: Lighting */}
        <AnimationContainer isActive={step === 2}>
           <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Sun */}
                <circle cx="80" cy="20" r="10" fill="#FFD700" className="animate-sun-pulse" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                    <line 
                        key={angle}
                        x1="80" y1="20" 
                        x2={80 + 15 * Math.cos(angle * Math.PI / 180)} 
                        y2={20 + 15 * Math.sin(angle * Math.PI / 180)}
                        stroke="#FFD700" strokeWidth="2" strokeLinecap="round"
                        className="animate-sun-pulse"
                    />
                ))}
                {/* Ground and Shadow */}
                <path d="M0 80 Q 50 70, 100 80 L 100 100 L 0 100 Z" fill="#d3c9b8" />
                <path d="M0 80 Q 50 70, 100 80 L 100 100 L 0 100 Z" fill="#4d4c4a" fillOpacity="0.4" className="animate-shadow-sweep"/>
            </svg>
        </AnimationContainer>

        {/* Step 3: Polishing */}
        <AnimationContainer isActive={step === 3}>
          <div className="absolute top-0 left-0 w-full h-full animate-brush-sweep">
             <svg viewBox="0 0 100 100" className="w-full h-full">
                <g transform="translate(0 25) rotate(-15 50 50)">
                    {/* Brush Handle */}
                    <path d="M 5 50 C 5 40, 10 40, 20 40 L 80 40 C 90 40, 95 40, 95 50 L 95 55 C 95 65, 90 65, 80 65 L 20 65 C 10 65, 5 65, 5 55 Z" fill="#c68f5c" />
                    {/* Bristles */}
                    <path d="M 15 65 L 10 80 L 20 80 L 25 65 Z M 30 65 L 25 80 L 35 80 L 40 65 Z M 45 65 L 40 80 L 50 80 L 55 65 Z M 60 65 L 55 80 L 65 80 L 70 65 Z M 75 65 L 70 80 L 80 80 L 85 65 Z" fill="#4d4c4a" />
                </g>
             </svg>
          </div>
          {/* Sparkles */}
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
             <path d="M20 75L21.5 81.5L28 83L21.5 84.5L20 91L18.5 84.5L12 83L18.5 81.5L20 75Z" fill="#FFD700" className="animate-sparkle" style={{ animationDelay: '0.2s' }}/>
             <path d="M50 35L52.5 47.5L65 50L52.5 52.5L50 65L47.5 52.5L35 50L47.5 47.5L50 35Z" fill="#e6e2da" className="animate-sparkle" style={{ animationDelay: '0.6s' }}/>
             <path d="M80 60L81.5 66.5L88 68L81.5 69.5L80 76L78.5 69.5L72 68L78.5 66.5L80 60Z" fill="#c68f5c" className="animate-sparkle" style={{ animationDelay: '1s' }}/>
          </svg>
        </AnimationContainer>
      </div>
      <style>{`
        /* --- Animation System --- */
        @keyframes elegant-fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-elegant-fade-in {
            /* Delay allows old animation to fade out before this starts */
            animation: elegant-fade-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s forwards;
            opacity: 0;
        }

        /* --- Step 0: Analyzing --- */
        @keyframes magnify-move {
          0%, 100% { transform: translate(0, 0) rotate(-15deg) scale(0.9); }
          50% { transform: translate(10px, 10px) rotate(15deg) scale(1); }
        }
        .animate-magnify-move { animation: magnify-move 2s ease-in-out infinite; }

        /* --- Step 1: Applying (New) --- */
        @keyframes lay-tile {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-lay-tile { animation: lay-tile 0.4s ease-out forwards; opacity: 0; }
        
        /* --- Step 2: Lighting --- */
         @keyframes sun-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .animate-sun-pulse { animation: sun-pulse 2s ease-in-out infinite; transform-origin: 80px 20px; }
        @keyframes shadow-sweep {
          0% { clip-path: polygon(0 0, 0 0, 0 100%, 0% 100%); }
          50% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
          100% { clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%); }
        }
        .animate-shadow-sweep { animation: shadow-sweep 2.5s ease-in-out infinite; }
        
        /* --- Step 3: Polishing (New Brush) --- */
        @keyframes brush-sweep {
          from { transform: translateX(-40%); }
          to { transform: translateX(120%); }
        }
        .animate-brush-sweep { animation: brush-sweep 1.8s ease-in-out infinite; }
        @keyframes sparkle {
          0%, 100% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
          60% { transform: scale(1); opacity: 1; }
        }
        .animate-sparkle { animation: sparkle 1.8s ease-in-out infinite; }
      `}</style>
    </>
  );
};

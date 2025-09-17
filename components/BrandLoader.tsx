import React from 'react';

interface BrandLoaderProps {
  className?: string;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({ className }) => {
  // A pattern of stones that animate sequentially, as if laying a path.
  const stones = [
    { top: '15%', left: '35%', width: '30%', height: '15%', delay: '0s' },
    { top: '33%', left: '20%', width: '30%', height: '15%', delay: '0.15s' },
    { top: '33%', left: '50%', width: '30%', height: '15%', delay: '0.3s' },
    { top: '51%', left: '35%', width: '30%', height: '15%', delay: '0.45s' },
    { top: '69%', left: '20%', width: '30%', height: '15%', delay: '0.6s' },
    { top: '69%', left: '50%', width: '30%', height: '15%', delay: '0.75s' },
  ];

  return (
    <>
      <div className={`relative w-16 h-16 ${className}`}>
        {stones.map((stone, i) => (
          <div
            key={i}
            className="absolute bg-indigo-500/75 dark:bg-indigo-400/75 rounded-md animate-stone-appear"
            style={{
              top: stone.top,
              left: stone.left,
              width: stone.width,
              height: stone.height,
              animationDelay: stone.delay
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes stone-appear {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.5);
          }
        }
        .animate-stone-appear {
          animation: stone-appear 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

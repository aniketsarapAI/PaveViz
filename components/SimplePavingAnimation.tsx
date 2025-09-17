import React from 'react';

export const SimplePavingAnimation: React.FC = () => {
  return (
    <>
      <div className="w-8 h-8 grid grid-cols-2 grid-rows-2 gap-0.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-sm animate-paver-load-simple"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <style>{`
        @keyframes paver-load-simple {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
        .animate-paver-load-simple {
          animation: paver-load-simple 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
};


import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center p-6 md:p-10">
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white">
        AI Paving Visualizer
      </h1>
      <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
        See your new patio before you build it. Upload a photo of your space and a paving sample to get a photorealistic preview in seconds.
      </p>
    </header>
  );
};

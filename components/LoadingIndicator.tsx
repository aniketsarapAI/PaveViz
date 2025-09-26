import React, { useState, useEffect } from 'react';
import { MultiStepLoaderAnimation } from './MultiStepLoaderAnimation';
import type { ImageFile } from '../types';

interface LoadingIndicatorProps {
  siteImage: ImageFile | null;
  messages: string[];
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ siteImage, messages }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Reset index when component mounts or messages change
  useEffect(() => {
    setCurrentMessageIndex(0);
  }, [messages]);

  // Sequentially progress through messages without looping.
  useEffect(() => {
    if (currentMessageIndex < messages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex(prevIndex => prevIndex + 1);
      }, 2500); // Change message every 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, messages.length]);

  return (
    <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full">
      <div 
        className="relative w-full bg-slate-200 dark:bg-slate-700/50 rounded-xl overflow-hidden"
        style={{ 
          aspectRatio: siteImage ? `${siteImage.width} / ${siteImage.height}` : '16 / 9',
          minHeight: '200px'
        }}
      >
        {/* Blurred background */}
        {siteImage && (
          <img 
            src={siteImage.dataUrl} 
            alt="Visualization background" 
            className="absolute inset-0 w-full h-full object-cover blur-md scale-105" 
          />
        )}

        {/* Overlay and content */}
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center p-4">
          <MultiStepLoaderAnimation step={currentMessageIndex} />
          <p className="text-white mt-4 font-semibold transition-opacity duration-500" key={currentMessageIndex}>
            {messages[currentMessageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { BrandLoader } from './BrandLoader';
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
    <>
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full">
        <div 
          className="relative w-full bg-slate-200 dark:bg-slate-700/50 rounded-xl overflow-hidden shimmer-bg"
          style={{ 
            aspectRatio: siteImage ? `${siteImage.width} / ${siteImage.height}` : '16 / 9',
            minHeight: '200px'
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
            <BrandLoader />
            <p className="text-slate-600 dark:text-slate-300 mt-4 font-semibold transition-opacity duration-500" key={currentMessageIndex}>
              {messages[currentMessageIndex]}
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .shimmer-bg {
          background-color: #e2e8f0;
          background-image: linear-gradient(to right, #e2e8f0 0%, #f1f5f9 20%, #e2e8f0 40%, #e2e8f0 100%);
          background-repeat: no-repeat;
          background-size: 2000px 100%;
          display: inline-block;
          animation: shimmer 3s infinite linear;
        }
        .dark .shimmer-bg {
          background-color: #334155;
          background-image: linear-gradient(to right, #334155 0%, #475569 20%, #334155 40%, #334155 100%);
        }
      `}</style>
    </>
  );
};
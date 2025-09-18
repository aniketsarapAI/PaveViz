import React, { useState, useEffect } from 'react';
import type { ImageFile } from '../types';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { AdvancedPromptInput } from './AdvancedPromptInput';
import { LoadingIndicator } from './LoadingIndicator';
import { BrandLoader } from './BrandLoader';

interface ResultDisplayProps {
  isLoading: boolean;
  isRefining: boolean;
  isSmartDesigning: boolean;
  error: string | null;
  siteImage: ImageFile | null;
  resultImage: ImageFile | null;
  advancedPrompt: string;
  onAdvancedPromptChange: (value: string) => void;
  onRefine: () => void;
  onSmartDesign: () => void;
}

const REFINING_MESSAGES = [
  "Understanding your instructions...",
  "Making the requested adjustments...",
  "Enhancing image details...",
  "Almost there..."
];


export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  isLoading, 
  isRefining,
  isSmartDesigning,
  error, 
  siteImage, 
  resultImage,
  advancedPrompt,
  onAdvancedPromptChange,
  onRefine,
  onSmartDesign,
}) => {
  const [refiningMessageIndex, setRefiningMessageIndex] = useState(0);

  // When refining starts, reset the message index.
  useEffect(() => {
    if (isRefining) {
      setRefiningMessageIndex(0);
    }
  }, [isRefining]);

  // Sequentially progress through messages without looping.
  useEffect(() => {
    let timer: number | undefined;
    if (isRefining && refiningMessageIndex < REFINING_MESSAGES.length - 1) {
      timer = window.setTimeout(() => {
        setRefiningMessageIndex(prevIndex => prevIndex + 1);
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [isRefining, refiningMessageIndex]);
  
  if (isLoading) {
    return (
      <LoadingIndicator 
        siteImage={siteImage}
        messages={[
          "Analyzing your photo's layout...",
          "Applying the new paving texture...",
          "Matching lighting and shadows...",
          "Polishing the final result..."
        ]}
      />
    );
  }

  if (error && !resultImage) { // Only show full-screen error if there's no image to display
    return (
      <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
        <h3 className="text-xl font-semibold text-red-700 dark:text-red-300">An Error Occurred</h3>
        <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
      </div>
    );
  }

  if (resultImage && siteImage) {
    const isAnyLoading = isLoading || isRefining || isSmartDesigning;
    return (
      <>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <h2 className="text-2xl font-bold text-center pt-6 text-slate-900 dark:text-white">Your Paving Visualization</h2>
          <div 
            className="p-2 relative w-full max-w-full mx-auto"
            style={{ aspectRatio: `${siteImage.width} / ${siteImage.height}` }}
          >
              <>
                {/* --- Refining Overlay --- */}
                {isRefining && (
                  <div className="absolute inset-2 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl animate-fade-in-fast">
                    <BrandLoader className="w-12 h-12" />
                    <p className="mt-4 font-semibold text-white text-center transition-opacity duration-500 px-4" key={refiningMessageIndex}>
                      {REFINING_MESSAGES[refiningMessageIndex]}
                    </p>
                  </div>
                )}
                
                <ReactCompareSlider
                  itemOne={<ReactCompareSliderImage src={siteImage.dataUrl} alt="Before" />}
                  itemTwo={
                    <ReactCompareSliderImage 
                      key={resultImage.dataUrl} // Re-mounts on change to trigger animation
                      src={resultImage.dataUrl} 
                      alt="After" 
                      style={{ animation: 'fadeIn 0.5s ease-in-out' }}
                    />
                  }
                  className="w-full h-full rounded-xl"
                />
              </>
          </div>
          <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
             {error && (
              <div className="text-center p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
             )}
            <div className="pb-6">
              <AdvancedPromptInput 
                value={advancedPrompt}
                onChange={onAdvancedPromptChange}
              />
              <div className="mt-4 flex flex-wrap justify-center items-center gap-3">
                 <button
                  onClick={onRefine}
                  disabled={isAnyLoading}
                  className={`
                    px-6 py-3 text-md font-bold text-white rounded-full transition-all duration-300 ease-in-out
                    ${isAnyLoading
                      ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transform hover:scale-105'
                    }
                  `}
                >
                  {isRefining ? 'Refining...' : '♻️ Refine Result'}
                </button>
              </div>
            </div>
            <div className="pt-6 text-center">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Want More Ideas?</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-md mx-auto">
                    Let AI explore the possibilities for you, sit back and relax.
                </p>
                <button
                    onClick={onSmartDesign}
                    disabled={isAnyLoading}
                    className={`
                      px-6 py-3 text-md font-bold text-white rounded-full transition-all duration-300 ease-in-out
                      ${isAnyLoading
                        ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 transform hover:scale-105'
                      }
                    `}
                >
                    {isSmartDesigning ? 'Generating...' : '🚀 Generate Smart Designs'}
                </button>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
           @keyframes fade-in-fast {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fade-in-fast {
            animation: fade-in-fast 0.3s ease-out;
          }
        `}</style>
      </>
    );
  }

  // Initial placeholder state
  return (
    <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[300px]">
        <svg className="w-16 h-16 text-slate-300 dark:text-slate-600" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <h3 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">Your Visualization Will Appear Here</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          Your generated image will be displayed in this area after processing.
        </p>
    </div>
  );
};
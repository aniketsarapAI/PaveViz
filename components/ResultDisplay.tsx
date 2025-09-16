import React from 'react';
import { Spinner } from './Spinner';
import type { ImageFile } from '../types';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { AdvancedPromptInput } from './AdvancedPromptInput';

interface ResultDisplayProps {
  isLoading: boolean;
  isRefining: boolean;
  error: string | null;
  siteImage: ImageFile | null;
  resultImage: ImageFile | null;
  advancedPrompt: string;
  onAdvancedPromptChange: (value: string) => void;
  onRefine: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  isLoading, 
  isRefining,
  error, 
  siteImage, 
  resultImage,
  advancedPrompt,
  onAdvancedPromptChange,
  onRefine
}) => {
  if (isLoading) {
    return (
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
        <div className="flex justify-center items-center mb-4">
          <Spinner />
        </div>
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Generating Your Preview...</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">The AI is working its magic. This can take a moment.</p>
      </div>
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
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <h2 className="text-2xl font-bold text-center pt-6 text-slate-900 dark:text-white">Your Paving Visualization</h2>
        <div 
          className="p-2 relative w-full max-w-full mx-auto"
          style={{ aspectRatio: `${siteImage.width} / ${siteImage.height}` }}
        >
          <ReactCompareSlider
            itemOne={<ReactCompareSliderImage src={siteImage.dataUrl} alt="Before" />}
            itemTwo={<ReactCompareSliderImage src={resultImage.dataUrl} alt="After" />}
            className="w-full h-full rounded-xl"
          />
        </div>
        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50">
           {error && (
            <div className="text-center p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
           )}
          <AdvancedPromptInput 
            value={advancedPrompt}
            onChange={onAdvancedPromptChange}
          />
          <div className="mt-4 text-center">
             <button
              onClick={onRefine}
              disabled={isRefining}
              className={`
                px-6 py-3 text-md font-bold text-white rounded-full transition-all duration-300 ease-in-out
                ${isRefining 
                  ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transform hover:scale-105'
                }
              `}
            >
              {isRefining ? 'Refining...' : '♻️ Refine Result'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Ready to Visualize?</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Upload your images and click the button to see the result here.</p>
    </div>
  );
};


import React, { useState } from 'react';
import type { GalleryItem } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface GalleryDetailModalProps {
  item: GalleryItem;
  onClose: () => void;
}

export const GalleryDetailModal: React.FC<GalleryDetailModalProps> = ({ item, onClose }) => {
  const [view, setView] = useState<'generated' | 'original'>('generated');

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-detail-title"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 id="gallery-detail-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Design Details
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Paving: {item.pavingName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col">
          {/* Main Image Display Area */}
          <div
            className="w-full bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center p-2"
            style={{ aspectRatio: `${item.siteImage.width} / ${item.siteImage.height}` }}
          >
            <img
              src={view === 'generated' ? item.generatedImage.dataUrl : item.siteImage.dataUrl}
              alt={view === 'generated' ? 'Generated Paving' : 'Original Site Photo'}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Toggle Buttons */}
          <div className="flex-shrink-0 flex justify-center items-center gap-2 py-4">
            <button
              onClick={() => setView('generated')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                view === 'generated'
                  ? 'bg-londonstone-red text-white shadow'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              Generated Image
            </button>
            <button
              onClick={() => setView('original')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                view === 'original'
                  ? 'bg-londonstone-red text-white shadow'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              Original Photo
            </button>
          </div>
          
          {/* Details Section */}
          <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Image Details
            </h3>
             <div className="space-y-4 text-sm">
                <div>
                    <p className="font-semibold text-slate-600 dark:text-slate-400">Paving Style</p>
                    <p className="text-slate-800 dark:text-slate-200">{item.pavingName}</p>
                </div>
                <div>
                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                      {item.isInitial ? 'Description' : 'Change Applied'}
                    </p>
                    <p className="text-slate-800 dark:text-slate-200 italic">"{item.description}"</p>
                </div>
            </div>
          </div>
        </main>
      </div>
       <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
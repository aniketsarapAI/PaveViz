
import React, { useState } from 'react';
import type { GalleryItem } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { downloadImage } from '../utils/fileUtils';
import { GalleryDetailModal } from './GalleryDetailModal';

interface HistoryModalProps {
  history: GalleryItem[];
  gallery: GalleryItem[]; // To check if an item is already in the main gallery
  onClose: () => void;
  onMoveToGallery: (item: GalleryItem) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ history, gallery, onClose, onMoveToGallery }) => {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const handleDownload = (item: GalleryItem) => {
    const fileName = `${item.pavingName.replace(/ /g, '_')}_${item.id}.png`;
    downloadImage(item.generatedImage, fileName);
  };
  
  const isItemInGallery = (historyItem: GalleryItem) => {
    return gallery.some(galleryItem => galleryItem.generatedImage.dataUrl === historyItem.generatedImage.dataUrl);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
      >
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <h2 id="history-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Session History
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </header>

          <main className="flex-grow overflow-y-auto p-4 md:p-6">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">No History Yet</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">Generated images will appear here as you create them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {history.map((item) => {
                  const alreadyInGallery = isItemInGallery(item);
                  return (
                    <div key={item.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden shadow-md flex flex-col group">
                      <button
                        className="w-full h-48 overflow-hidden block"
                        onClick={() => setSelectedItem(item)}
                        aria-label={`View details for ${item.description}`}
                      >
                        <img
                          src={item.generatedImage.dataUrl}
                          alt={item.description}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </button>
                      <div className="p-3 flex-grow flex flex-col justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.description}>
                            {item.description}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Paving: {item.pavingName}
                          </p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => onMoveToGallery(item)}
                            disabled={alreadyInGallery}
                            className={`w-full px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                              alreadyInGallery
                                ? 'bg-green-600 text-white cursor-default'
                                : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500'
                            }`}
                          >
                            {alreadyInGallery ? '✓ In Gallery' : 'Move to Gallery'}
                          </button>
                          <button
                            onClick={() => handleDownload(item)}
                            className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                            aria-label="Download Image"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
        `}</style>
      </div>

      {selectedItem && (
        <GalleryDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
};

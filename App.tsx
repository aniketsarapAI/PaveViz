

import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PavingSelector } from './components/PavingSelector';
import { ResultDisplay } from './components/ResultDisplay';
import { Gallery } from './components/Gallery';
import { generateInitialVisualization, refineVisualization, summarizeRefinement } from './services/geminiService';
import type { ImageFile, GalleryItem } from './types';
import { HistoryModal } from './components/HistoryModal';

interface PavingSelection {
  image: ImageFile | null;
  name: string | null;
}

const App: React.FC = () => {
  const [siteImage, setSiteImage] = useState<ImageFile | null>(null);
  const [pavingSelection, setPavingSelection] = useState<PavingSelection>({ image: null, name: null });
  const [resultImage, setResultImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isSwatchLoading, setIsSwatchLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedPrompt, setAdvancedPrompt] = useState<string>('');
  
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [sessionHistory, setSessionHistory] = useState<GalleryItem[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);

  const [potentialGalleryItem, setPotentialGalleryItem] = useState<Omit<GalleryItem, 'id'> | null>(null);
  const [isCurrentResultSaved, setIsCurrentResultSaved] = useState<boolean>(false);


  const handleSiteImageChange = useCallback((image: ImageFile | null) => {
    setSiteImage(image);
    setResultImage(null); // Reset result on new image
    setError(null);
    setGallery([]); // Reset gallery for new project
    setSessionHistory([]); // Reset history for new project
  }, []);

  const handlePavingSelectionChange = useCallback((selection: PavingSelection) => {
    setPavingSelection(selection);
    setResultImage(null); // Reset result on new selection
    setError(null);
  }, []);
  
  const addToHistory = (item: Omit<GalleryItem, 'id'>) => {
    const newHistoryItem: GalleryItem = {
      ...item,
      id: `session-${Date.now()}` // Use a unique prefix for session items
    };
    setSessionHistory(prev => [newHistoryItem, ...prev]);
  };

  const handleVisualize = async () => {
    if (!siteImage || !pavingSelection.image || !pavingSelection.name) {
      setError("Please upload a site photo and select a paving swatch.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setAdvancedPrompt(''); // Reset prompt for new visualizations

    try {
      const result = await generateInitialVisualization(siteImage, pavingSelection.image);
      
      if (result.success === false) {
        setError(result.reason);
      } else {
        setResultImage(result.image);
        const itemToSave: Omit<GalleryItem, 'id'> = {
          siteImage,
          generatedImage: result.image,
          pavingName: pavingSelection.name,
          description: `Initial visualization with ${pavingSelection.name}`,
          isInitial: true,
        };
        setPotentialGalleryItem(itemToSave);
        addToHistory(itemToSave);
        setIsCurrentResultSaved(false); // New image is not saved yet
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!resultImage || !siteImage || !pavingSelection.image || !pavingSelection.name) {
      setError("Cannot refine without an initial result, site image, and paving selection.");
      return;
    }
     if (!advancedPrompt.trim()) {
      setError("Please provide refinement instructions to the AI.");
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const result = await refineVisualization(siteImage, pavingSelection.image, advancedPrompt);
      
      if (result.success === false) {
        setError(result.reason);
      } else {
        setResultImage(result.image);
        
        const summary = await summarizeRefinement(advancedPrompt);

        const itemToSave: Omit<GalleryItem, 'id'> = {
          siteImage: siteImage, 
          generatedImage: result.image,
          pavingName: pavingSelection.name, 
          description: summary,
          isInitial: false,
        };
        
        setPotentialGalleryItem(itemToSave);
        addToHistory(itemToSave);
        setIsCurrentResultSaved(false); // New refined image is not saved yet
        
        setAdvancedPrompt(''); // Clear prompt after successful refinement
      }
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during refinement.");
    } finally {
      setIsRefining(false);
    }
  };
  
  const handleSaveToGallery = useCallback(() => {
    if (!potentialGalleryItem || isCurrentResultSaved) return;

    const newGalleryItem: GalleryItem = {
      ...potentialGalleryItem,
      id: Date.now().toString(),
    };
    setGallery(prevGallery => [newGalleryItem, ...prevGallery]);
    setIsCurrentResultSaved(true);
  }, [potentialGalleryItem, isCurrentResultSaved]);

  const handleToggleHistory = () => setIsHistoryVisible(prev => !prev);

  const handleMoveToGallery = useCallback((itemToMove: GalleryItem) => {
    // Check if an item with the same generated image data already exists in the main gallery
    const isAlreadyInGallery = gallery.some(item => item.generatedImage.dataUrl === itemToMove.generatedImage.dataUrl);

    if (!isAlreadyInGallery) {
      setGallery(prevGallery => [itemToMove, ...prevGallery]);
    }
  }, [gallery]);


  const isVisualizeDisabled = !siteImage || !pavingSelection.image || isLoading || isRefining || isSwatchLoading;

  const getButtonText = () => {
    if (isLoading) return 'Visualizing...';
    if (isSwatchLoading) return 'Loading Paving...';
    return '✨ Visualize Paving';
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <ImageUploader
              id="site-photo"
              label="1. Upload Site Photo"
              description="Your garden, patio, or driveway."
              onImageChange={handleSiteImageChange}
            />
            <PavingSelector 
              onPavingChange={handlePavingSelectionChange}
              onIsLoadingChange={setIsSwatchLoading}
            />
          </div>
        </div>

        <div className="my-8 md:my-12 text-center">
            <button
              onClick={handleVisualize}
              disabled={isVisualizeDisabled}
              className={`
                px-8 py-4 text-lg font-bold text-white rounded-full transition-all duration-300 ease-in-out
                ${isVisualizeDisabled 
                  ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' 
                  : 'bg-londonstone-red hover:bg-londonstone-red-dark transform hover:scale-105 shadow-lg'
                }
              `}
            >
              {getButtonText()}
            </button>
        </div>

        <div className="max-w-4xl mx-auto">
           <ResultDisplay 
              isLoading={isLoading} 
              isRefining={isRefining}
              error={error}
              siteImage={siteImage}
              resultImage={resultImage}
              advancedPrompt={advancedPrompt}
              onAdvancedPromptChange={setAdvancedPrompt}
              onRefine={handleRefine}
              onSaveToGallery={handleSaveToGallery}
              isCurrentResultSaved={isCurrentResultSaved}
              pavingName={pavingSelection.name}
              onToggleHistory={handleToggleHistory}
            />
        </div>
        
        {gallery.length > 0 && (
          <div className="mt-8 md:mt-12 max-w-6xl mx-auto">
            <Gallery gallery={gallery} />
          </div>
        )}

      </main>
       {isHistoryVisible && (
        <HistoryModal
          history={sessionHistory}
          gallery={gallery}
          onClose={handleToggleHistory}
          onMoveToGallery={handleMoveToGallery}
        />
      )}
      <footer className="text-center p-4 text-xs text-slate-500">
        Powered by Gemini AI
      </footer>
    </div>
  );
};

export default App;
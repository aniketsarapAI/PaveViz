
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PavingSelector } from './components/PavingSelector';
import { ResultDisplay } from './components/ResultDisplay';
import { Gallery } from './components/Gallery';
import { generateInitialVisualization, refineVisualization, summarizeRefinement } from './services/geminiService';
import type { ImageFile, GalleryItem } from './types';

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

  const handleSiteImageChange = useCallback((image: ImageFile | null) => {
    setSiteImage(image);
    setResultImage(null); // Reset result on new image
    setError(null);
  }, []);

  const handlePavingSelectionChange = useCallback((selection: PavingSelection) => {
    setPavingSelection(selection);
    setResultImage(null); // Reset result on new selection
    setError(null);
  }, []);

  const handleVisualize = async () => {
    if (!siteImage || !pavingSelection.image) {
      setError("Please upload a site photo and select a paving swatch.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setAdvancedPrompt(''); // Reset prompt for new visualizations

    try {
      const generatedImage = await generateInitialVisualization(siteImage, pavingSelection.image);
      if (generatedImage) {
        setResultImage(generatedImage);
        const newGalleryItem: GalleryItem = {
          id: Date.now().toString(),
          siteImage,
          generatedImage,
          pavingName: pavingSelection.name || 'Unknown Paving',
          description: `Initial visualization with ${pavingSelection.name || 'Unknown Paving'}`,
          isInitial: true,
        };
        setGallery(prevGallery => [newGalleryItem, ...prevGallery]);
      } else {
        setError("The AI could not generate an image. Please try different images.");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!resultImage) {
      setError("Cannot refine without an initial result. Please generate an image first.");
      return;
    }
     if (!advancedPrompt.trim()) {
      setError("Please provide refinement instructions to the AI.");
      return;
    }

    const latestGalleryItem = gallery[0];
    if (!latestGalleryItem) {
      setError("Cannot refine, no design history found.");
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const refinedImage = await refineVisualization(
        resultImage, 
        advancedPrompt, 
        pavingSelection.image // Provide paving context
      );
      if (refinedImage) {
        setResultImage(refinedImage);
        
        const summary = await summarizeRefinement(advancedPrompt);

        const newGalleryItem: GalleryItem = {
          id: Date.now().toString(),
          siteImage: latestGalleryItem.siteImage, // Persist the original site image
          generatedImage: refinedImage,
          pavingName: latestGalleryItem.pavingName, // Persist the original paving name
          description: summary,
          isInitial: false,
        };
        
        setGallery(prevGallery => [newGalleryItem, ...prevGallery]);
        
        setAdvancedPrompt(''); // Clear prompt after successful refinement
      } else {
        setError("The AI could not refine the image. Please try adjusting your instructions.");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during refinement.");
    } finally {
      setIsRefining(false);
    }
  };
  
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
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transform hover:scale-105 shadow-lg'
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
            />
        </div>
        
        {gallery.length > 0 && (
          <div className="mt-8 md:mt-12 max-w-6xl mx-auto">
            <Gallery gallery={gallery} />
          </div>
        )}

      </main>
      <footer className="text-center p-4 text-xs text-slate-500">
        Powered by Gemini AI
      </footer>
    </div>
  );
};

export default App;

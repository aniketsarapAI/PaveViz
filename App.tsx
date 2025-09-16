import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PavingSelector } from './components/PavingSelector';
import { ResultDisplay } from './components/ResultDisplay';
import { Gallery } from './components/Gallery';
import { visualizePaving } from './services/geminiService';
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
  const [error, setError] = useState<string | null>(null);
  const [advancedPrompt, setAdvancedPrompt] = useState<string>('');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

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
      // For the first generation, we use an empty prompt.
      const generatedImage = await visualizePaving(siteImage, pavingSelection.image, '');
      if (generatedImage) {
        setResultImage(generatedImage);
        const newGalleryItem: GalleryItem = {
          id: Date.now().toString(),
          siteImage,
          resultImage: generatedImage,
          pavingName: pavingSelection.name || 'Unknown Paving',
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
    if (!siteImage || !pavingSelection.image || !resultImage) {
      setError("Cannot refine without an initial image and selection.");
      return;
    }
     if (!advancedPrompt.trim()) {
      setError("Please provide refinement instructions to the AI.");
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const refinedImage = await visualizePaving(siteImage, pavingSelection.image, advancedPrompt);
      if (refinedImage) {
        setResultImage(refinedImage);
        // Smartly update the most recent gallery item instead of adding a new one
        setGallery(prevGallery => {
          const newGallery = [...prevGallery];
          if (newGallery.length > 0) {
            newGallery[0] = { ...newGallery[0], resultImage: refinedImage };
          }
          return newGallery;
        });
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
  
  const isButtonDisabled = !siteImage || !pavingSelection.image || isLoading || isRefining;

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
              onImageChange={setSiteImage}
            />
            <PavingSelector onPavingChange={setPavingSelection} />
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handleVisualize}
              disabled={isButtonDisabled}
              className={`
                px-8 py-4 text-lg font-bold text-white rounded-full transition-all duration-300 ease-in-out
                ${isButtonDisabled 
                  ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transform hover:scale-105 shadow-lg'
                }
              `}
            >
              {isLoading ? 'Visualizing...' : '✨ Visualize Paving'}
            </button>
          </div>
        </div>

        <div className="mt-8 md:mt-12 max-w-4xl mx-auto">
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
import React, { useState, useCallback, DragEvent } from 'react';
import { getImageDimensions } from '../utils/fileUtils';
import { PhotoIcon } from './icons/PhotoIcon';
import type { ImageFile } from '../types';

interface ImageUploaderProps {
  id: string;
  label: string;
  description: string;
  onImageChange: (file: ImageFile | null) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, description, onImageChange }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (file: File | undefined | null) => {
    if (!file) {
      setPreview(null);
      onImageChange(null);
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      const { width, height } = await getImageDimensions(dataUrl);

      const imageFile: ImageFile = {
        base64: dataUrl.split(',')[1],
        mimeType: file.type,
        dataUrl,
        width,
        height,
      };

      setPreview(imageFile.dataUrl);
      onImageChange(imageFile);

    } catch (error) {
      console.error("Error processing image file:", error);
      setPreview(null);
      onImageChange(null);
    }
  }, [onImageChange]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    processFile(file);
  }, [processFile]);

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    // Ensure it's an image file
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <h3 className="mb-2 text-sm font-semibold text-center text-slate-700 dark:text-slate-300">{label}</h3>
      <label
        htmlFor={id}
        className={`
          flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700 transition-all duration-200
          ${isDragging 
            ? 'ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-londonstone-red bg-slate-100 dark:bg-slate-600' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-600'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            <PhotoIcon className="w-10 h-10 mb-4 text-slate-500 dark:text-slate-400" />
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Drag & drop photo here, or click</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        )}
        <input id={id} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>
       {/* Placeholder for alignment with PavingSelector which has text below it */}
       <div className="h-6 mt-2" />
    </div>
  );
};
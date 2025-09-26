import React, { useState, useCallback } from 'react';
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

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      onImageChange(null);
      return;
    }

    try {
      // 1. Read the file into a data URL format.
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // 2. Load the image in the browser to get its natural dimensions.
      const { width, height } = await getImageDimensions(dataUrl);

      // 3. Construct the full ImageFile object.
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

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <label htmlFor={id} className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            <PhotoIcon className="w-10 h-10 mb-4 text-slate-500 dark:text-slate-400" />
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        )}
        <input id={id} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>
    </div>
  );
};

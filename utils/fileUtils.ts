
import type { ImageFile } from '../types';

const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (error) => reject(error);
    img.src = dataUrl;
  });
};

export const fileToBase64 = async (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const { width, height } = await getImageDimensions(dataUrl);
        const base64 = dataUrl.split(',')[1];
        resolve({
          base64,
          mimeType: file.type,
          dataUrl,
          width,
          height,
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const processDataUrlToImageFile = async (dataUrl: string): Promise<ImageFile> => {
  const { width, height } = await getImageDimensions(dataUrl);
  const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
  const base64 = dataUrl.split(',')[1];
  return {
    base64,
    mimeType,
    dataUrl,
    width,
    height,
  };
};

import type { ImageFile } from '../types';

export const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (error) => reject(error);
    img.src = dataUrl;
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

/**
 * Resizes a source image to match the target dimensions using a "cover" effect.
 * The source image is scaled to fill the target dimensions, and any excess is cropped
 * from the center. This uses modern browser APIs for better performance.
 * @param sourceImage The image to resize.
 * @param targetWidth The target width in pixels.
 * @param targetHeight The target height in pixels.
 * @returns A new ImageFile with the exact target dimensions.
 */
export const resizeImageToMatch = async (
  sourceImage: ImageFile,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageFile> => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    const blob = await (await fetch(sourceImage.dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);

    const scale = Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height);
    const scaledWidth = bitmap.width * scale;
    const scaledHeight = bitmap.height * scale;
    const x = (targetWidth - scaledWidth) / 2;
    const y = (targetHeight - scaledHeight) / 2;
    
    ctx.drawImage(bitmap, x, y, scaledWidth, scaledHeight);
    
    // Use a high quality factor for JPEG, ignored for PNG
    const resizedDataUrl = canvas.toDataURL(sourceImage.mimeType, 0.95);
    const base64 = resizedDataUrl.split(',')[1];

    return {
      base64,
      mimeType: sourceImage.mimeType,
      dataUrl: resizedDataUrl,
      width: targetWidth,
      height: targetHeight,
    };
};


import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ImageFile } from '../types';
import { processDataUrlToImageFile } from '../utils/fileUtils';
import { UndoIcon } from './icons/UndoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { BrushIcon } from './icons/BrushIcon';


interface ImageMaskerProps {
  imageToMask: ImageFile;
  onSaveMask: (maskFile: ImageFile) => void;
  onCancel: () => void;
}

export const ImageMasker: React.FC<ImageMaskerProps> = ({ imageToMask, onSaveMask, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  const getCanvasAndContext = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    return { canvas, context };
  };

  const saveToHistory = useCallback(() => {
    const { context } = getCanvasAndContext(drawingCanvasRef);
    if (context) {
      const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
      setHistory(prev => [...prev.slice(-10), imageData]); // Keep last 10 steps
    }
  }, []);

  useEffect(() => {
    const { canvas: imageCanvas, context: imageContext } = getCanvasAndContext(imageCanvasRef);
    const { canvas: drawingCanvas, context: drawingContext } = getCanvasAndContext(drawingCanvasRef);
    if (!imageCanvas || !imageContext || !drawingCanvas || !drawingContext || !containerRef.current) return;
    
    const image = new Image();
    image.src = imageToMask.dataUrl;
    image.onload = () => {
      const { clientWidth, clientHeight } = containerRef.current!;
      imageCanvas.width = drawingCanvas.width = clientWidth;
      imageCanvas.height = drawingCanvas.height = clientHeight;

      imageContext.drawImage(image, 0, 0, clientWidth, clientHeight);
      drawingContext.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      drawingContext.lineCap = 'round';
      drawingContext.lineJoin = 'round';
      
      saveToHistory();
    };

  }, [imageToMask, saveToHistory]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    const pos = getCoordinates(e);
    if (pos) {
      setIsDrawing(true);
      lastPos.current = pos;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getCoordinates(e);
    const { context } = getCanvasAndContext(drawingCanvasRef);
    if (pos && context && lastPos.current) {
      context.lineWidth = brushSize;
      context.beginPath();
      context.moveTo(lastPos.current.x, lastPos.current.y);
      context.lineTo(pos.x, pos.y);
      context.stroke();
      lastPos.current = pos;
    }
  };

  const endDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPos.current = null;
      saveToHistory();
    }
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const { context } = getCanvasAndContext(drawingCanvasRef);
      const newHistory = history.slice(0, -1);
      const lastState = newHistory[newHistory.length - 1];
      if (context && lastState) {
        context.putImageData(lastState, 0, 0);
      }
      setHistory(newHistory);
    }
  };

  const handleClear = () => {
    if (history.length > 1) {
        const { context } = getCanvasAndContext(drawingCanvasRef);
        const firstState = history[0];
        if (context && firstState) {
          context.putImageData(firstState, 0, 0);
          setHistory([firstState]);
        }
    }
  };

  const handleSave = async () => {
    const { canvas: drawingCanvas } = getCanvasAndContext(drawingCanvasRef);
    if (!drawingCanvas) return;
    
    // Create a new canvas to generate the black and white mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = drawingCanvas.width;
    maskCanvas.height = drawingCanvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!maskCtx) return;
    
    // Fill with black
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Draw the user's strokes in white
    maskCtx.drawImage(drawingCanvas, 0, 0);

    const dataUrl = maskCanvas.toDataURL('image/png');
    const maskFile = await processDataUrlToImageFile(dataUrl);
    onSaveMask(maskFile);
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    draw(e as unknown as React.MouseEvent<HTMLCanvasElement>);
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative" ref={containerRef}>
      <canvas ref={imageCanvasRef} className="absolute inset-0 w-full h-full" />
      <div 
        className="absolute inset-0 w-full h-full cursor-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursorPos({x: -100, y: -100})}
      >
        <canvas
          ref={drawingCanvasRef}
          className="w-full h-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
         <div 
          className="absolute pointer-events-none border-2 border-white rounded-full mix-blend-difference"
          style={{ 
            left: cursorPos.x, 
            top: cursorPos.y, 
            width: `${brushSize}px`, 
            height: `${brushSize}px`,
            transform: `translate(-50%, -50%)`
          }} 
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur-sm p-2 rounded-full shadow-lg flex items-center gap-2 text-white">
        <div className="flex items-center gap-2 px-2">
            <BrushIcon className="w-5 h-5"/>
            <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24"
                aria-label="Brush size"
            />
        </div>
        <div className="w-px h-6 bg-slate-600" />
        <button onClick={handleUndo} disabled={history.length <= 1} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Undo">
            <UndoIcon className="w-5 h-5" />
        </button>
        <button onClick={handleClear} disabled={history.length <= 1} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Clear all">
            <TrashIcon className="w-5 h-5"/>
        </button>
        <div className="w-px h-6 bg-slate-600" />
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold bg-slate-600 rounded-full hover:bg-slate-500">Cancel</button>
        <button onClick={handleSave} className="px-3 py-1.5 text-xs font-semibold bg-indigo-500 rounded-full hover:bg-indigo-600">Apply Mask</button>
      </div>
    </div>
  );
};

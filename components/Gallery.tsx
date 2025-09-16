import React from 'react';
import type { GalleryItem } from '../types';
import jsPDF from 'jspdf';

interface GalleryProps {
  gallery: GalleryItem[];
}

export const Gallery: React.FC<GalleryProps> = ({ gallery }) => {

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    gallery.forEach((item, index) => {
      if (index > 0) {
        doc.addPage();
      }
      doc.setFontSize(18);
      doc.text('AI Paving Visualization', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Paving Used: ${item.pavingName}`, 105, 30, { align: 'center' });

      // A4 page is 210mm wide. Image is 180mm. Margin is (210-180)/2 = 15mm
      doc.addImage(item.resultImage.dataUrl, item.resultImage.mimeType.split('/')[1].toUpperCase(), 15, 40, 180, 135);
    });

    doc.save('paving-visualizations.pdf');
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Results Gallery
        </h2>
        <button
          onClick={handleDownloadPdf}
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
        >
          Download as PDF
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {gallery.map((item) => (
          <div key={item.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden shadow-md">
            <img 
              src={item.resultImage.dataUrl} 
              alt={`Visualization with ${item.pavingName}`} 
              className="w-full h-48 object-cover" 
            />
            <div className="p-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.pavingName}>
                {item.pavingName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
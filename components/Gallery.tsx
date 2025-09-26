
import React, { useState } from 'react';
import type { GalleryItem } from '../types';
import jsPDF from 'jspdf';
import { GalleryDetailModal } from './GalleryDetailModal';

interface GalleryProps {
  gallery: GalleryItem[];
}

// Fix: Define a type for the grouped designs to help TypeScript's inference.
type DesignGroup = {
  siteImage: GalleryItem['siteImage'];
  designs: GalleryItem[];
};

export const Gallery: React.FC<GalleryProps> = ({ gallery }) => {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 20;

    // Fix: Explicitly type the accumulator ('acc') in the reduce function.
    // This resolves an issue where TypeScript could not infer the type correctly,
    // causing the 'group' variable below to be of type 'unknown'.
    const groupedBySiteImage = gallery.reduce((acc: Record<string, DesignGroup>, item) => {
      if (!acc[item.siteImage.dataUrl]) {
        acc[item.siteImage.dataUrl] = {
          siteImage: item.siteImage,
          designs: []
        };
      }
      acc[item.siteImage.dataUrl].designs.unshift(item); // unshift to reverse order for chronological report
      return acc;
    }, {});

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Paving Design Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    Object.values(groupedBySiteImage).forEach((group, groupIndex) => {

      if (groupIndex > 0) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 5;
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;
      
      const addImage = (imageFile: GalleryItem['siteImage'], title: string, subtitle?: string) => {
        const titleHeight = subtitle ? 12 : 7;
        const spacing = 12;
        const imgHeight = (imageFile.height / imageFile.width) * contentWidth;

        if (yPos + imgHeight + titleHeight + spacing > pageHeight) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 6;

        if (subtitle) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100);
          doc.text(subtitle, margin, yPos, { maxWidth: contentWidth });
          const subtitleLines = doc.splitTextToSize(subtitle, contentWidth).length;
          yPos += (subtitleLines * 4) + 2;
          doc.setTextColor(0);
        }

        doc.addImage(imageFile.dataUrl, imageFile.mimeType.split('/')[1].toUpperCase(), margin, yPos, contentWidth, imgHeight);
        yPos += imgHeight + spacing;
      };
      
      // 1. Add the unique Site Photo for the group
      addImage(group.siteImage, `Project ${groupIndex + 1}: Original Site Photo`);
      
      doc.setDrawColor(220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // 2. Iterate through each design in the group
      group.designs.forEach((item, designIndex) => {
         const subtitle = item.isInitial
            ? `Paving: ${item.pavingName}`
            : `Change Applied: "${item.description}"`;

         addImage(item.generatedImage, `Generated Image #${designIndex + 1}`, subtitle);
         
         if(designIndex < group.designs.length - 1) {
            yPos += 5;
            doc.setDrawColor(240); // Lighter separator for individual images
            doc.line(margin + 20, yPos, pageWidth - margin - 20, yPos);
            yPos += 15;
         }
      });
    });

    doc.save('paving-design-report.pdf');
  };

  return (
    <>
      <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Design Gallery
          </h2>
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 text-sm font-semibold text-white bg-londonstone-red rounded-md hover:bg-londonstone-red-dark transition-colors"
          >
            Download Report as PDF
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {gallery.map((item) => {
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden shadow-md group text-left transition-all hover:shadow-xl hover:scale-105"
              >
                <div className="w-full h-48 overflow-hidden">
                  <img
                    src={item.generatedImage.dataUrl}
                    alt={item.description}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.description}>
                    {item.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Paving: {item.pavingName}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
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

import React, { useState, useMemo, useEffect } from 'react';
import type { ImageFile, Product, ProductType } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { Spinner } from './Spinner';
import { PhotoIcon } from './icons/PhotoIcon';
import { processDataUrlToImageFile } from '../utils/fileUtils';

// The app is now connected to your Google Drive via this secure URL.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxzv3n-bAjKxK9B3rF2kt2ZBs029LRiDiRetqaXwmR2ODhziIVisQe-whueFcEOjYRDZw/exec';

interface PavingSelectorProps {
  onPavingChange: (paving: { image: ImageFile | null; name: string | null }) => void;
}

const CATEGORIES: ProductType[] = ['porcelain', 'stone', 'clay'];

export const PavingSelector: React.FC<PavingSelectorProps> = ({ onPavingChange }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeCategory, setActiveCategory] = useState<ProductType>('porcelain');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSwatchLoading, setIsSwatchLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductList = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(APPS_SCRIPT_URL);
        
        if (!response.ok) {
          throw new Error(`Network error: Failed to fetch product list (status: ${response.status}).`);
        }
        const data: Product[] | { error: string } = await response.json();
        
        if (data && 'error' in data) {
           throw new Error(`An error occurred in the Google Apps Script: ${data.error}`);
        }

        setProducts(data as Product[]);
      } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An unknown error occurred while fetching products.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductList();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.product_type === activeCategory);
  }, [activeCategory, products]);

  useEffect(() => {
    setSelectedProduct(null);
    onPavingChange({ image: null, name: null });
  }, [activeCategory, onPavingChange]);

  const handleProductSelect = async (product: Product) => {
    if (isSwatchLoading) return;
      
    if (selectedProduct?.product_file_id === product.product_file_id) {
        setSelectedProduct(null);
        onPavingChange({ image: null, name: null });
        return;
    }
    
    setSelectedProduct(product);
    setIsSwatchLoading(product.product_file_id);
    onPavingChange({ image: null, name: null }); 

    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?fileId=${product.product_file_id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch swatch data.');
        }
        const data: { product_img_dataUrl?: string; error?: string } = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.product_img_dataUrl) {
            // Fix: Use the utility function to create a complete ImageFile object,
            // including width and height, to satisfy the ImageFile type.
            const imageFile = await processDataUrlToImageFile(data.product_img_dataUrl);
            onPavingChange({ image: imageFile, name: product.product_name });
        }
    } catch (err) {
        console.error(err);
        setError("Could not load selected paving swatch. Please try again.");
        setSelectedProduct(null);
    } finally {
        setIsSwatchLoading(null);
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <div className="flex-shrink-0 mb-3 p-1 bg-slate-200 dark:bg-slate-800 rounded-lg flex justify-center space-x-1 animate-pulse">
            {CATEGORIES.map(category => (
              <div key={category} className="w-full h-7 bg-slate-300 dark:bg-slate-700 rounded-md" />
            ))}
          </div>
          <div className="flex-grow overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-full">
                  <div className="aspect-square bg-slate-300 dark:bg-slate-600 rounded-md" />
                  <div className="h-2 mt-1.5 bg-slate-300 dark:bg-slate-600 rounded-full w-3/4 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </>
      );
    }
    
    if (error) {
       return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
          <h4 className="font-semibold text-red-700 dark:text-red-300">Failed to Load Products</h4>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-full overflow-hidden text-ellipsis px-2">
            {error}
          </p>
        </div>
      );
    }
    
    if (products.length === 0 && !isLoading) {
      return (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300">No Products Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your Google Drive folder might be empty or is not shared correctly.
            </p>
          </div>
      );
    }
    
    return (
      <>
        <div className="flex-shrink-0 mb-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex justify-center space-x-1">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`w-full px-3 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                activeCategory === category
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex-grow overflow-y-auto pr-2 -mr-1">
            <div className="grid grid-cols-3 gap-2">
                {filteredProducts.map(product => (
                    <div key={product.product_file_id}>
                      <button
                          onClick={() => handleProductSelect(product)}
                          className={`relative block w-full aspect-square rounded-md overflow-hidden border-2 transition-all duration-200 group ${
                              selectedProduct?.product_file_id === product.product_file_id
                              ? 'border-indigo-500 ring-2 ring-indigo-500'
                              : 'border-slate-200 dark:border-slate-600 hover:border-indigo-400'
                          }`}
                      >
                          <img src={product.product_img_url} alt={product.product_name} className="w-full h-full object-cover bg-slate-200 dark:bg-slate-600 group-hover:scale-105 transition-transform duration-200"/>
                          
                          {isSwatchLoading === product.product_file_id && (
                              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                                  <Spinner />
                              </div>
                          )}

                          {selectedProduct?.product_file_id === product.product_file_id && isSwatchLoading !== product.product_file_id && (
                              <div className="absolute inset-0 bg-indigo-500/50 flex items-center justify-center">
                                  <CheckIcon className="w-6 h-6 text-white"/>
                              </div>
                          )}
                      </button>
                      <p className="mt-1.5 text-center text-[10px] leading-tight font-medium text-slate-700 dark:text-slate-300 h-6 truncate" title={product.product_name}>
                          {product.product_name}
                      </p>
                    </div>
                ))}
                {filteredProducts.length === 0 && (
                    <div className="col-span-3 text-center text-xs text-slate-500 dark:text-slate-400 py-8">
                        No products in this category.
                    </div>
                )}
            </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <h3 className="mb-2 text-sm font-semibold text-center text-slate-700 dark:text-slate-300">2. Select Paving Swatch</h3>
      <div className="w-full h-64 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-3 flex flex-col bg-slate-50 dark:bg-slate-700">
        {renderContent()}
      </div>
       {selectedProduct && !isSwatchLoading && (
          <div className="mt-2 text-center text-xs text-slate-600 dark:text-slate-400 font-medium truncate px-2 h-4">
            Selected: {selectedProduct.product_name}
          </div>
        )}
       {(!selectedProduct || isSwatchLoading) && <div className="h-6 mt-2" /> }
    </div>
  );
};
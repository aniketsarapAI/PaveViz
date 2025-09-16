export interface ImageFile {
  base64: string;
  mimeType: string;
  dataUrl: string;
  width: number;
  height: number;
}

export type ProductType = 'porcelain' | 'stone' | 'clay';

export interface Product {
  product_type: ProductType;
  product_name: string;
  product_img_url: string;   // For fast thumbnail display
  product_file_id: string; // To fetch full data on demand
}

export interface GalleryItem {
  id: string;
  siteImage: ImageFile;
  resultImage: ImageFile;
  pavingName: string;
}

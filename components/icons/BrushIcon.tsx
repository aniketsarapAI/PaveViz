
import React from 'react';

export const BrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    {...props}
  >
    <path d="M14 5C14 3.34315 12.6569 2 11 2C9.34315 2 8 3.34315 8 5V10H14V5Z" />
    <path fillRule="evenodd" d="M16 3H18C19.1046 3 20 3.89543 20 5V9C20 10.1046 19.1046 11 18 11H6C4.89543 11 4 10.1046 4 9V5C4 3.89543 4.89543 3 6 3H8V5C8 6.65685 9.34315 8 11 8C12.6569 8 14 6.65685 14 5V3H16ZM5 13V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V13H5Z" clipRule="evenodd" />
  </svg>
);

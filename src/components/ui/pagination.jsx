import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ children, className = '', ...props }) => (
  <nav role="navigation" aria-label="pagination" className={`mx-auto flex w-full justify-center ${className}`} {...props}>
    {children}
  </nav>
);

export const PaginationContent = ({ children, className = '', ...props }) => (
  <ul className={`flex flex-row items-center gap-1 ${className}`} {...props}>
    {children}
  </ul>
);

export const PaginationItem = ({ children, className = '', ...props }) => (
  <li className={className} {...props}>
    {children}
  </li>
);

export const PaginationLink = ({ children, isActive = false, className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${
      isActive 
        ? 'bg-gray-900 text-gray-50 hover:bg-gray-900/90' 
        : 'hover:bg-gray-100 hover:text-gray-900'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const PaginationPrevious = ({ className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-100 hover:text-gray-900 h-10 px-4 py-2 gap-1 pl-2.5 ${className}`}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </button>
);

export const PaginationNext = ({ className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-100 hover:text-gray-900 h-10 px-4 py-2 gap-1 pr-2.5 ${className}`}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </button>
);

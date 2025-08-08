import React, { useEffect } from 'react';

export const AlertDialog = ({ children, open, onOpenChange }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/80" 
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50">
        {React.Children.map(children, child => 
          React.cloneElement(child, { onOpenChange })
        )}
      </div>
    </div>
  );
};

export const AlertDialogContent = ({ children, className = '', onOpenChange, ...props }) => (
  <div 
    className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-white p-6 shadow-lg duration-200 sm:rounded-lg ${className}`} 
    onClick={(e) => e.stopPropagation()}
    {...props}
  >
    {children}
  </div>
);

export const AlertDialogHeader = ({ children, className = '', ...props }) => (
  <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`} {...props}>
    {children}
  </div>
);

export const AlertDialogTitle = ({ children, className = '', ...props }) => (
  <h2 className={`text-lg font-semibold ${className}`} {...props}>
    {children}
  </h2>
);

export const AlertDialogDescription = ({ children, className = '', ...props }) => (
  <div className={`text-sm text-gray-500 ${className}`} {...props}>
    {children}
  </div>
);

export const AlertDialogFooter = ({ children, className = '', ...props }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`} {...props}>
    {children}
  </div>
);

export const AlertDialogAction = ({ children, className = '', ...props }) => (
  <button
    className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-50 ring-offset-white transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const AlertDialogCancel = ({ children, className = '', onOpenChange, ...props }) => (
  <button
    className={`mt-2 inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold ring-offset-white transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0 ${className}`}
    onClick={() => onOpenChange(false)}
    {...props}
  >
    {children || 'Cancel'}
  </button>
);

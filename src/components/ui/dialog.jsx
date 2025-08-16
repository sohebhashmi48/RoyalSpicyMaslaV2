import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Dialog = ({ children, open, onOpenChange }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-4xl max-h-[90vh] flex items-center justify-center">
        {React.Children.map(children, child => 
          child ? React.cloneElement(child, { onOpenChange }) : null
        )}
      </div>
    </div>
  );
};

export const DialogContent = ({ children, className = '', onOpenChange, ...props }) => (
  <div 
    className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${className}`} 
    onClick={(e) => e.stopPropagation()}
    {...props}
  >
    <div className="max-h-[90vh] overflow-y-auto">
      {children}
    </div>
    <button
      className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 z-10 bg-white"
      onClick={() => onOpenChange(false)}
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);

export const DialogHeader = ({ children, className = '', ...props }) => (
  <div className={`p-6 pb-0 ${className}`} {...props}>
    {children}
  </div>
);

export const DialogTitle = ({ children, className = '', ...props }) => (
  <h2 className={`text-lg font-semibold ${className}`} {...props}>
    {children}
  </h2>
);

export const DialogDescription = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-gray-600 mt-2 ${className}`} {...props}>
    {children}
  </p>
);

export const DialogTrigger = ({ children, asChild, ...props }) => {
  if (asChild) {
    return React.cloneElement(children, props);
  }
  return <button {...props}>{children}</button>;
};

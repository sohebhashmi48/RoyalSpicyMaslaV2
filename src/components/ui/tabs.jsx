import React, { useState } from 'react';

export const Tabs = ({ children, value, onValueChange, defaultValue, className = '', ...props }) => {
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  
  const currentValue = value || internalValue;
  
  const handleValueChange = (newValue) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };
  
  return (
    <div className={className} {...props}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { value: currentValue, onValueChange: handleValueChange })
      )}
    </div>
  );
};

export const TabsList = ({ children, value, onValueChange, className = '', ...props }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`} {...props}>
    {React.Children.map(children, child => 
      React.cloneElement(child, { value, onValueChange })
    )}
  </div>
);

export const TabsTrigger = ({ children, value: triggerValue, currentValue, onValueChange, className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
      currentValue === triggerValue 
        ? 'bg-white text-gray-950 shadow-sm' 
        : 'hover:bg-white/50'
    } ${className}`}
    onClick={() => onValueChange(triggerValue)}
    {...props}
  >
    {children}
  </button>
);

export const TabsContent = ({ children, value: contentValue, value: currentValue, className = '', onValueChange, ...props }) => {
  if (currentValue !== contentValue) return null;

  return (
    <div className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  );
};


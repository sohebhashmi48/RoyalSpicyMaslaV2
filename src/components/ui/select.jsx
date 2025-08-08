import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = ({ children, value, onValueChange, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  
  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);
  
  return (
    <div className="relative" {...props}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { 
          value: internalValue, 
          onValueChange, 
          isOpen, 
          setIsOpen,
          setInternalValue 
        })
      )}
    </div>
  );
};

export const SelectTrigger = ({ children, className = '', isOpen, setIsOpen }) => (
  <button
    type="button"
    className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    onClick={() => setIsOpen(!isOpen)}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </button>
);

export const SelectValue = ({ placeholder = 'Select...', value }) => (
  <span className={value ? '' : 'text-gray-500'}>
    {value || placeholder}
  </span>
);

export const SelectContent = ({ children, isOpen, setIsOpen, onValueChange, setInternalValue }) => {
  if (!isOpen) return null;
  
  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white text-gray-950 shadow-md">
      {React.Children.map(children, child =>
        React.cloneElement(child, { onValueChange, setIsOpen, setInternalValue })
      )}
    </div>
  );
};

export const SelectItem = ({ children, value, onValueChange, setIsOpen, setInternalValue }) => (
  <div
    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    onClick={() => {
      setInternalValue(value);
      onValueChange?.(value);
      setIsOpen(false);
    }}
  >
    {children}
  </div>
);

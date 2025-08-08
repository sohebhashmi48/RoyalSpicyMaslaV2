import React, { createContext, useContext, useState } from 'react';

const CollapsibleContext = createContext();

export function Collapsible({ children, open, onOpenChange, ...props }) {
  const [isOpen, setIsOpen] = useState(open || false);

  const handleToggle = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  const contextValue = {
    isOpen: open !== undefined ? open : isOpen,
    toggle: handleToggle
  };

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({ children, asChild, ...props }) {
  const context = useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error('CollapsibleTrigger must be used within a Collapsible');
  }

  const handleClick = (e) => {
    e.preventDefault();
    context.toggle();
    if (props.onClick) {
      props.onClick(e);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick
    });
  }

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  );
}

export function CollapsibleContent({ children, ...props }) {
  const context = useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error('CollapsibleContent must be used within a Collapsible');
  }

  if (!context.isOpen) {
    return null;
  }

  return (
    <div {...props}>
      {children}
    </div>
  );
}

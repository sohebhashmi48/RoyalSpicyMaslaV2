import { useState, useEffect } from 'react';

let toastCount = 0;
let toastQueue = [];
let listeners = [];

const addToast = (toast) => {
  const id = ++toastCount;
  const newToast = { ...toast, id };
  
  toastQueue = [...toastQueue, newToast];
  listeners.forEach(listener => listener([...toastQueue]));
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    listeners.forEach(listener => listener([...toastQueue]));
  }, 5000);
};

export const toast = (toastData) => {
  addToast(toastData);
};

export const useToast = () => {
  const [toasts, setToasts] = useState([]);
  
  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter(l => l !== setToasts);
    };
  }, []);
  
  return { toast: addToast, toasts };
};

// Toast display component
export const Toaster = () => {
  const { toasts } = useToast();
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-md p-4 rounded-lg shadow-lg border ${
            toast.variant === 'destructive' 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="font-semibold">{toast.title}</div>
          {toast.description && (
            <div className="text-sm mt-1 opacity-90">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  );
};

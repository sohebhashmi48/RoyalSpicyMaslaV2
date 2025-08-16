import { useState } from 'react';
import { ShieldCheckIcon, ShieldExclamationIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import { useSafety } from '../../contexts/SafetyContext';

const SafetyDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  operation = 'perform this action', 
  itemName = 'item'
}) => {
  const { verifyPassword } = useSafety();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate a slight delay for better UX
    setTimeout(() => {
      if (verifyPassword(password)) {
        setPassword('');
        onConfirm();
      } else {
        setError('Invalid password. Please try again.');
      }
      setLoading(false);
    }, 500);
  };

  const getOperationColor = () => {
    if (operation.toLowerCase().includes('delete')) return 'text-red-600';
    if (operation.toLowerCase().includes('edit')) return 'text-blue-600';
    if (operation.toLowerCase().includes('add')) return 'text-green-600';
    return 'text-orange-600';
  };

  const getOperationIcon = () => {
    if (operation.toLowerCase().includes('delete')) {
      return <ShieldExclamationIcon className="h-12 w-12 text-red-600" />;
    }
    return <ShieldCheckIcon className="h-12 w-12 text-orange-600" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Safety Verification Required"
      maxWidth="max-w-md"
    >
      <div className="p-1">
        <div className="flex flex-col items-center justify-center mb-6">
          {getOperationIcon()}
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Password Required
          </h3>
          <p className="mt-2 text-sm text-center text-gray-600">
            You are attempting to <span className={`font-medium ${getOperationColor()}`}>{operation}</span>
            {itemName && <span> for <span className="font-medium">"{itemName}"</span></span>}. 
            Please enter your password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter password"
                required
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default SafetyDialog;

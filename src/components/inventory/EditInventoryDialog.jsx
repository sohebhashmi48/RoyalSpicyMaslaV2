import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CubeIcon,
  ScaleIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { useSafety } from '../../contexts/SafetyContext';
import SafetyDialog from '../common/SafetyDialog';

const EditInventoryDialog = ({ isOpen, onClose, onInventoryUpdated, editInventory = null }) => {
  const { showSuccess, showError } = useToast();
  const { requiresSafetyCheck } = useSafety();
  const [loading, setLoading] = useState(false);
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);

  const [formData, setFormData] = useState({
    product_name: '',
    batch: '',
    quantity: '',
    value: '',
    status: 'In Stock'
  });

  useEffect(() => {
    if (isOpen && editInventory) {
      setFormData({
        product_name: editInventory.product_name || '',
        batch: editInventory.batch || '',
        quantity: editInventory.quantity?.toString() || '',
        value: editInventory.value?.toString() || '',
        status: editInventory.status || 'In Stock'
      });
    }
  }, [isOpen, editInventory]);

  // Disable body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (requiresSafetyCheck('edit')) {
      setShowSafetyDialog(true);
      return;
    }
    
    await performSubmit();
  };

  const performSubmit = async () => {
    try {
      setLoading(true);
      
      // Validate quantity format (3 decimal places)
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity < 0) {
        showError('Please enter a valid quantity');
        return;
      }

      // Validate value
      const value = parseFloat(formData.value);
      if (isNaN(value) || value < 0) {
        showError('Please enter a valid value');
        return;
      }

      // For now, just simulate success - will be replaced with actual API call
      console.log('Updating inventory item:', {
        ...formData,
        quantity: parseFloat(formData.quantity),
        value: parseFloat(formData.value)
      });

      showSuccess('Inventory item updated successfully');
      onInventoryUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating inventory item:', error);
      showError('Failed to update inventory item');
    } finally {
      setLoading(false);
    }
  };

  const handleSafetyConfirm = () => {
    setShowSafetyDialog(false);
    performSubmit();
  };

  const statusOptions = [
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Critical', label: 'Critical' },
    { value: 'Out of Stock', label: 'Out of Stock' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 transition-opacity" 
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.4)', 
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      ></div>
      
      {/* Dialog container */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Dialog content */}
        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10" 
          style={{ maxHeight: '90vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CubeIcon className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Edit Inventory Item</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-6">
              {/* Product Name (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Product name cannot be changed</p>
              </div>

              {/* Batch (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Batch
                </label>
                <input
                  type="text"
                  name="batch"
                  value={formData.batch}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Batch number cannot be changed</p>
              </div>

              {/* Quantity and Value Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Quantity (kg) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      step="0.001"
                      min="0"
                      required
                      placeholder="0.000"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <ScaleIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter quantity with up to 3 decimal places</p>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Value (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="value"
                      value={formData.value}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <CurrencyRupeeIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </div>
                  ) : (
                    'Update Inventory'
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Safety Dialog */}
          {showSafetyDialog && (
            <SafetyDialog
              isOpen={showSafetyDialog}
              onClose={() => setShowSafetyDialog(false)}
              onConfirm={handleSafetyConfirm}
              title="Edit Inventory Item"
              message={`Are you sure you want to update ${formData.product_name} (${formData.batch})?`}
              actionType="edit"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditInventoryDialog;

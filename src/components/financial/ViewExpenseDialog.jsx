import { useEffect } from 'react';
import {
  XMarkIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  CalendarIcon,
  TagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const ViewExpenseDialog = ({ isOpen, onClose, expense }) => {
  // Handle body scroll when dialog is open
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

  if (!isOpen || !expense) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 text-orange-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Expense Details</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expense Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Name
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900 font-medium">{expense.expense_name}</span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  {expense.category}
                </span>
              </div>
            </div>
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(expense.expense_amount)}
                </span>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Date
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900 font-medium">
                  {formatDate(expense.expense_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-gray-900 whitespace-pre-wrap">{expense.notes}</p>
              </div>
            </div>
          )}

          {/* Receipt Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Image
            </label>
            {expense.receipt_image ? (
              <div className="space-y-3">
                <div className="relative inline-block">
                  <img
                    src={`http://localhost:5000/api/expenses/receipts/${expense.receipt_image}`}
                    alt="Receipt"
                    className="max-w-full h-auto max-h-96 rounded-md border border-gray-300 shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden items-center justify-center p-8 bg-gray-50 rounded-md border border-gray-300">
                    <div className="text-center">
                      <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Receipt image not available</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={`http://localhost:5000/api/expenses/receipts/${expense.receipt_image}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <PhotoIcon className="h-4 w-4 mr-1" />
                    View Full Size
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-gray-50 rounded-md border border-gray-300">
                <div className="text-center">
                  <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No receipt image uploaded</p>
                </div>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created At
              </label>
              <p className="text-sm text-gray-600">
                {formatDateTime(expense.created_at)}
              </p>
            </div>
            {expense.updated_at !== expense.created_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Updated
                </label>
                <p className="text-sm text-gray-600">
                  {formatDateTime(expense.updated_at)}
                </p>
              </div>
            )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ViewExpenseDialog ;

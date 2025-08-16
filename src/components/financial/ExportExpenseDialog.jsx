import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  DocumentArrowDownIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';

const ExportExpenseDialog = ({ isOpen, onClose }) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    dateFrom: '',
    dateTo: new Date().toISOString().split('T')[0] // Default to today
  });

  useEffect(() => {
    if (isOpen) {
      // Set default date range (last 30 days)
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      setDateRange({
        dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0]
      });
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExport = async () => {
    if (!dateRange.dateFrom || !dateRange.dateTo) {
      showError('Please select both start and end dates');
      return;
    }

    if (new Date(dateRange.dateFrom) > new Date(dateRange.dateTo)) {
      showError('Start date cannot be after end date');
      return;
    }

    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
        export: 'csv'
      });

      const response = await fetch(`http://localhost:5000/api/expenses/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export expenses');
      }

      // Get the CSV content
      const csvContent = await response.text();
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `expenses_${dateRange.dateFrom}_to_${dateRange.dateTo}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('Expenses exported successfully');
      onClose();
    } catch (error) {
      console.error('Error exporting expenses:', error);
      showError('Failed to export expenses');
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (days) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    
    setDateRange({
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0]
    });
  };

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
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentArrowDownIcon className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Export Expenses</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 mb-6">
              Select the date range for expenses you want to export to CSV format.
            </p>

            <div className="space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    From Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="dateFrom"
                      value={dateRange.dateFrom}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <CalendarIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    To Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="dateTo"
                      value={dateRange.dateTo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <CalendarIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Quick Range Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Quick Select
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickRange(7)}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickRange(30)}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickRange(90)}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    Last 3 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                      setDateRange({
                        dateFrom: firstDayOfMonth.toISOString().split('T')[0],
                        dateTo: today.toISOString().split('T')[0]
                      });
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    This Month
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </div>
              ) : (
                'Export CSV'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportExpenseDialog;

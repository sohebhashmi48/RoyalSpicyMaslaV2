import { useState, useRef, useEffect } from 'react';
import { 
  DocumentArrowDownIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';

const ExportDropdown = ({ onExportExpenses, onExportAssets }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExportExpenses = () => {
    setIsOpen(false);
    onExportExpenses();
  };

  const handleExportAssets = () => {
    setIsOpen(false);
    onExportAssets();
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
          Export CSV
          <ChevronDownIcon className="h-4 w-4 ml-2" />
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            <button
              onClick={handleExportExpenses}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <CurrencyDollarIcon className="h-4 w-4 mr-3 text-red-500" />
              Export Expenses
              <span className="ml-auto text-xs text-gray-500">Date range</span>
            </button>
            <button
              onClick={handleExportAssets}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <BuildingLibraryIcon className="h-4 w-4 mr-3 text-green-500" />
              Export Assets
              <span className="ml-auto text-xs text-gray-500">All data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;

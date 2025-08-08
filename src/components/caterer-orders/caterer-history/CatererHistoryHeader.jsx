import React from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const CatererHistoryHeader = ({ navigate, fetchCatererHistory }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/caterer-orders')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Caterer History</h1>
            <p className="text-gray-600 mt-1">Manage caterer bills and payment tracking</p>
          </div>
        </div>
        <button
          onClick={fetchCatererHistory}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default CatererHistoryHeader;

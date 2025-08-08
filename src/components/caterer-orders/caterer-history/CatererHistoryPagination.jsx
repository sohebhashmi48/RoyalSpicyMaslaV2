import React from 'react';

const CatererHistoryPagination = ({ totalPages, currentPage, totalBills, bills, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-8">
      <div className="text-sm text-gray-600">
        Showing {bills.length} of {totalBills} bills
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="px-3 py-2 text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default CatererHistoryPagination;

import React from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';

const CatererHistoryFilters = ({
  searchQuery,
  handleSearch,
  showFilters,
  setShowFilters,
  minAmount,
  maxAmount,
  dateFilter,
  selectedDate,
  handleFilterChange,
  handleDateFilterChange,
  clearFilters
}) => {
  const hasActiveFilters = searchQuery || minAmount || maxAmount || dateFilter !== 'all' || selectedDate;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by bill number, caterer name, contact person, or phone..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Date Filter Dropdown */}
        <div className="lg:w-48">
          <select
            value={dateFilter}
            onChange={(e) => handleDateFilterChange('dateFilter', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent flex items-center gap-2"
          >
            <option value="all">All Dates</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_15_days">Last 15 Days</option>
            <option value="6_months">Last 6 Months</option>
          </select>
        </div>

        {/* Specific Date Filter */}
        <div className="lg:w-48">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateFilterChange('selectedDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent flex items-center gap-2"
            placeholder="Select specific date"
          />
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          More Filters
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Pending Amount
              </label>
              <input
                type="number"
                placeholder="₹0"
                value={minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Pending Amount
              </label>
              <input
                type="number"
                placeholder="₹999999"
                value={maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatererHistoryFilters;

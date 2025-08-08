import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';
import AddExpenseDialog from '../../components/financial/AddExpenseDialog';
import AddAssetDialog from '../../components/financial/AddAssetDialog';
import ExpenseList from '../../components/financial/ExpenseList';
import ExpenseFilters from '../../components/financial/ExpenseFilters';
import ExpensePagination from '../../components/financial/ExpensePagination';
import ExportDropdown from '../../components/financial/ExportDropdown';
import ExportExpenseDialog from '../../components/financial/ExportExpenseDialog';
import { useToast } from '../../contexts/ToastContext';

const FinancialTrackerPage = () => {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState('today-expense');
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
  const [showExportExpenseDialog, setShowExportExpenseDialog] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [editAsset, setEditAsset] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: 'all'
  });

  const tabs = [
    { id: 'today-expense', name: 'Today Expense', icon: CurrencyDollarIcon },
    { id: 'all-expense', name: 'All Expense', icon: ChartBarIcon },
    { id: 'your-assets', name: 'Your Assets', icon: BuildingLibraryIcon },
  ];

  // Load expenses on component mount
  useEffect(() => {
    fetchExpenses(1);
    fetchTodayExpenses();
    fetchAssets();
  }, []);

  const fetchExpenses = async (page = 1, currentFilters = filters) => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
      if (currentFilters.category && currentFilters.category !== 'all') {
        params.append('category', currentFilters.category);
      }

      const response = await fetch(`http://localhost:5000/api/expenses?${params}`);
      const data = await response.json();
      if (data.success) {
        setExpenses(data.expenses);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayExpenses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/expenses/today');
      const data = await response.json();
      if (data.success) {
        setTodayExpenses(data.expenses);
      }
    } catch (error) {
      console.error('Error fetching today expenses:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/assets');
      const data = await response.json();
      if (data.success) {
        setAssets(data.assets);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      showError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setEditExpense(null);
    setShowAddExpenseDialog(true);
  };

  const handleEditExpense = (expense) => {
    setEditExpense(expense);
    setShowAddExpenseDialog(true);
  };

  const handleAddAsset = () => {
    setEditAsset(null);
    setShowAddAssetDialog(true);
  };

  const handleEditAsset = (asset) => {
    setEditAsset(asset);
    setShowAddAssetDialog(true);
  };

  const handleAssetUpdated = () => {
    fetchAssets();
  };

  const handleExportExpenses = () => {
    setShowExportExpenseDialog(true);
  };

  const handleExportAssets = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/assets/export');

      if (!response.ok) {
        throw new Error('Failed to export assets');
      }

      // Get the CSV content
      const csvContent = await response.text();

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `assets_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess('Assets exported successfully');
    } catch (error) {
      console.error('Error exporting assets:', error);
      showError('Failed to export assets');
    }
  };

  const handleExpenseUpdated = () => {
    fetchExpenses(pagination.currentPage || 1, filters);
    fetchTodayExpenses();
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    // Reset to first page when filters change
    fetchExpenses(1, newFilters);
  };

  const handlePageChange = (page) => {
    fetchExpenses(page, filters);
  };

  const calculateTotalExpenses = (expenseList) => {
    return expenseList.reduce((total, expense) => total + parseFloat(expense.expense_amount), 0);
  };

  const calculateTotalAssetValue = (assetList) => {
    return assetList.reduce((total, asset) => total + parseFloat(asset.purchase_amount), 0);
  };

  const calculateCurrentAssetValue = (assetList) => {
    return assetList.reduce((total, asset) => {
      const currentValue = asset.current_value ? parseFloat(asset.current_value) : parseFloat(asset.purchase_amount);
      return total + currentValue;
    }, 0);
  };
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Tracker</h1>
              <p className="text-gray-600 text-sm">Track and manage your business finances</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <ExportDropdown
              onExportExpenses={handleExportExpenses}
              onExportAssets={handleExportAssets}
            />

            <button
              onClick={handleAddExpense}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Expense
            </button>

            <button
              onClick={handleAddAsset}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <BuildingLibraryIcon className="h-4 w-4 mr-2" />
              Add Assets
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {activeTab === 'today-expense' && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today's Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{calculateTotalExpenses(todayExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{todayExpenses.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average per Item</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{todayExpenses.length > 0 ? (calculateTotalExpenses(todayExpenses) / todayExpenses.length).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'all-expense' && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{calculateTotalExpenses(expenses).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{pagination.totalRecords || expenses.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average Expense</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{expenses.length > 0 ? (calculateTotalExpenses(expenses) / expenses.length).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'your-assets' && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BuildingLibraryIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Asset Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{calculateTotalAssetValue(assets).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Assets</p>
                    <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Current Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ₹{calculateCurrentAssetValue(assets).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'today-expense' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Today's Expenses</h2>
                  <p className="text-sm text-gray-600">Expenses recorded today ({new Date().toLocaleDateString()})</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Today</p>
                  <p className="text-xl font-bold text-red-600">
                    ₹{calculateTotalExpenses(todayExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <ExpenseList
              expenses={todayExpenses}
              onExpenseUpdated={handleExpenseUpdated}
              onEditExpense={handleEditExpense}
            />
          </div>
        )}

        {activeTab === 'all-expense' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">All Expenses</h2>
                  <p className="text-sm text-gray-600">Complete expense history and records</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">
                    ₹{calculateTotalExpenses(expenses).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <ExpenseFilters
              onFiltersChange={handleFiltersChange}
              initialFilters={filters}
            />

            <ExpenseList
              expenses={expenses}
              onExpenseUpdated={handleExpenseUpdated}
              onEditExpense={handleEditExpense}
              isLoading={loading}
            />

            <ExpensePagination
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {activeTab === 'your-assets' && (
          <div className="space-y-4">
            {assets.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <BuildingLibraryIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assets recorded</h3>
                <p className="text-gray-600">Start by adding your first asset to track your business assets.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {assets.map((asset) => (
                    <div key={asset.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="aspect-w-16 aspect-h-9 mb-4">
                        <img
                          src={`http://localhost:5000/uploads/assets/${asset.asset_image}`}
                          alt={asset.asset_title}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{asset.asset_title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{asset.category}</p>
                      <p className="text-lg font-semibold text-green-600">
                        ₹{parseFloat(asset.purchase_amount).toLocaleString('en-IN')}
                      </p>
                      <div className="mt-3 flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditAsset(asset)}
                          className="text-orange-600 hover:text-orange-900 text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Expense Dialog */}
      <AddExpenseDialog
        isOpen={showAddExpenseDialog}
        onClose={() => {
          setShowAddExpenseDialog(false);
          setEditExpense(null);
        }}
        onExpenseAdded={handleExpenseUpdated}
        editExpense={editExpense}
      />

      {/* Add/Edit Asset Dialog */}
      <AddAssetDialog
        isOpen={showAddAssetDialog}
        onClose={() => {
          setShowAddAssetDialog(false);
          setEditAsset(null);
        }}
        onAssetAdded={handleAssetUpdated}
        editAsset={editAsset}
      />

      {/* Export Expense Dialog */}
      <ExportExpenseDialog
        isOpen={showExportExpenseDialog}
        onClose={() => setShowExportExpenseDialog(false)}
      />
    </div>
  );
};

export default FinancialTrackerPage;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import InventoryTable from '../../components/inventory/InventoryTable';
import MergeProductsDialog from '../../components/inventory/MergeProductsDialog';
import { useToast } from '../../contexts/ToastContext';

const InventoryPage = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedProductForMerge, setSelectedProductForMerge] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async (forceRefresh = false) => {
    try {
      setLoading(true);
      // Add cache-busting parameter when force refreshing
      const url = forceRefresh
        ? `http://localhost:5000/api/inventory/summary?_t=${Date.now()}`
        : 'http://localhost:5000/api/inventory/summary';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setInventory(data.data || []);
      } else {
        showError(data.message || 'Failed to fetch inventory');
        setInventory([]);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      showError('Failed to load inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterInventory();
  }, [inventory, searchTerm, statusFilter]);

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return 'Empty';
    if (quantity < 5) return 'Critical';
    if (quantity < 10) return 'Low Stock';
    return 'In Stock';
  };

  const filterInventory = () => {
    let filtered = [...inventory];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.batch && item.batch.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = getStockStatus(parseFloat(item.total_quantity || 0));
        return status === statusFilter;
      });
    }

    setFilteredInventory(filtered);
  };

  const handleEditInventory = (item) => {
    // Inventory editing is disabled - managed through supplier purchases
    showError('Inventory is automatically managed through supplier purchases');
  };

  const handleInventoryUpdated = () => {
    fetchInventory();
  };

  const handleMergeProducts = (item) => {
    setSelectedProductForMerge(item);
    setShowMergeDialog(true);
  };

  const handleMergeSuccess = () => {
    // Add a small delay to ensure backend has processed the merge
    setTimeout(() => {
      fetchInventory(true); // Force refresh
    }, 500);
    setShowMergeDialog(false);
    setSelectedProductForMerge(null);
  };

  const handleDeleteInventory = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/inventory/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Inventory item deleted successfully');
        // Add a small delay to ensure backend has processed the deletion
        setTimeout(() => {
          fetchInventory(true); // Force refresh
        }, 500);
      } else {
        showError(data.message || 'Failed to delete inventory item');
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      showError('Failed to delete inventory item');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const handleCleanupMerged = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inventory/cleanup-merged', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        showSuccess(`Cleaned up ${data.affected_rows} merged batch records`);
        fetchInventory(true); // Force refresh the inventory
      } else {
        showError(data.message || 'Failed to cleanup merged batches');
      }
    } catch (error) {
      console.error('Error cleaning up merged batches:', error);
      showError('Failed to cleanup merged batches');
    }
  };

  // Calculate stats
  const totalItems = inventory.length; // Total number of batches
  const totalValue = inventory.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0);
  const totalQuantity = inventory.reduce((sum, item) => sum + parseFloat(item.total_quantity || 0), 0);
  const lowStockItems = inventory.filter(item => {
    const status = getStockStatus(parseFloat(item.total_quantity || 0));
    return status === 'Low Stock' || status === 'Critical' || status === 'Empty';
  }).length;

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Critical', label: 'Critical' },
    { value: 'Empty', label: 'Empty' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <CubeIcon className="h-8 w-8 text-orange-600 mr-3" />
                Inventory Management
              </h1>
              <p className="text-gray-600 mt-1">Track your product inventory - automatically updated when you purchase from suppliers</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/inventory/history')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Inventory History
              </button>
              <button
                onClick={handleCleanupMerged}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <CubeIcon className="h-4 w-4 mr-2" />
                Cleanup Merged
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CubeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900">{totalQuantity.toFixed(3)} kg</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CurrencyRupeeIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <CubeIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Alert Batches</p>
                <p className="text-2xl font-bold text-red-600">{lowStockItems}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by product name or batch number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <InventoryTable
            inventory={filteredInventory}
            loading={loading}
            onEdit={handleEditInventory}
            onDelete={handleDeleteInventory}
            onMerge={handleMergeProducts}
          />
        </div>

        {/* Merge Products Dialog */}
        <MergeProductsDialog
          isOpen={showMergeDialog}
          onClose={() => {
            setShowMergeDialog(false);
            setSelectedProductForMerge(null);
          }}
          selectedProduct={selectedProductForMerge}
          onMergeSuccess={handleMergeSuccess}
        />
      </div>
    </div>
  );
};

export default InventoryPage;

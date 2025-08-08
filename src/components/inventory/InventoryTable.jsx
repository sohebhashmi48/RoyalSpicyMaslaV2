import { useState } from 'react';
import {
  PencilIcon,
  TrashIcon,
  CubeIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { useSafety } from '../../contexts/SafetyContext';
import SafetyDialog from '../common/SafetyDialog';

const InventoryTable = ({ inventory, loading, onEdit, onDelete, onMerge }) => {
  const { requiresSafetyCheck } = useSafety();
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleEdit = (item) => {
    if (requiresSafetyCheck('edit')) {
      setSelectedItem(item);
      setPendingAction('edit');
      setShowSafetyDialog(true);
    } else {
      onEdit(item);
    }
  };

  const handleDelete = (item) => {
    if (requiresSafetyCheck('delete')) {
      setSelectedItem(item);
      setPendingAction('delete');
      setShowSafetyDialog(true);
    } else {
      onDelete(item.id);
    }
  };

  const handleSafetyConfirm = () => {
    if (pendingAction === 'edit') {
      onEdit(selectedItem);
    } else if (pendingAction === 'delete') {
      onDelete(selectedItem.id);
    }
    setShowSafetyDialog(false);
    setPendingAction(null);
    setSelectedItem(null);
  };

  const handleSafetyCancel = () => {
    setShowSafetyDialog(false);
    setPendingAction(null);
    setSelectedItem(null);
  };

  const getStockStatusLabel = (quantity) => {
    if (quantity <= 0) return 'Empty';
    if (quantity < 5) return 'Critical';
    if (quantity < 10) return 'Low Stock';
    return 'In Stock';
  };

  const getStockStatusColor = (quantity) => {
    if (quantity <= 0) return 'bg-gray-100 text-gray-800';
    if (quantity < 5) return 'bg-red-100 text-red-800';
    if (quantity < 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading inventory...</p>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="p-12 text-center">
        <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items found</h3>
        <p className="text-gray-600">Inventory will be automatically populated when you purchase products from suppliers.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product & Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost/KG
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {item.product_images && item.product_images.length > 0 ? (
                        <img
                          src={`http://localhost:5000/api/products/images/${item.product_images[0]}`}
                          alt={item.product_name}
                          className="h-10 w-10 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center ${item.product_images && item.product_images.length > 0 ? 'hidden' : ''}`}>
                        <CubeIcon className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product_name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {item.batch || 'No batch'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {item.sub_category || 'No category'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-semibold">
                    {parseFloat(item.total_quantity || 0).toFixed(3)} {item.unit}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-semibold">
                    ₹{Math.round(parseFloat(item.total_value || 0)).toLocaleString('en-IN')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-medium">
                    {item.cost_per_kg && parseFloat(item.cost_per_kg) > 0 ? (
                      <span className="text-blue-600">₹{parseFloat(item.cost_per_kg).toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">per kg</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(parseFloat(item.total_quantity || 0))}`}>
                    {getStockStatusLabel(parseFloat(item.total_quantity || 0))}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onMerge && onMerge(item)}
                      className="text-purple-600 hover:text-purple-900 p-1 rounded-md hover:bg-purple-50 transition-colors"
                      title="Merge product batches"
                    >
                      <ArrowsRightLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-orange-600 hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
                      title="Edit inventory item"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                      title="Delete inventory item"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Safety Dialog */}
      {showSafetyDialog && (
        <SafetyDialog
          isOpen={showSafetyDialog}
          onClose={handleSafetyCancel}
          onConfirm={handleSafetyConfirm}
          title={`${pendingAction === 'edit' ? 'Edit' : 'Delete'} Inventory Item`}
          message={`Are you sure you want to ${pendingAction === 'edit' ? 'edit' : 'delete'} ${selectedItem?.product_name}?`}
          actionType={pendingAction}
        />
      )}
    </>
  );
};

export default InventoryTable;

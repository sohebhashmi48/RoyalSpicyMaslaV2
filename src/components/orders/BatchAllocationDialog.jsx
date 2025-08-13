import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useToast } from '../../contexts/ToastContext';
import BatchSelectionDialog from './BatchSelectionDialog';

const QuantityInput = ({ value, onChange }) => (
  <Input
    type="number"
    step="0.001"
    min="0"
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value || '0'))}
    className="w-24"
  />
);

export default function BatchAllocationDialog({ isOpen, onClose, order }) {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState({});
  const [availableBatches, setAvailableBatches] = useState({});
  const [orderData, setOrderData] = useState(order || null);
  const [batchSelectionDialog, setBatchSelectionDialog] = useState({
    isOpen: false,
    product: null,
    currentAllocations: []
  });

  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  const itemsNeedingAllocation = useMemo(() => {
    const items = orderData?.items || [];
    const allocationItems = [];

    console.log('🔥 [DEBUG] Processing items:', items);

    for (const item of items) {
      console.log('🔥 [DEBUG] Processing item:', {
        id: item.id,
        name: item.product_name,
        source: item.source,
        hasCustomDetails: !!item.custom_details,
        productId: item.product_id
      });

      // SKIP mix container items - we only want their components
      if (item.source === 'mix-calculator') {
        let customDetails;
        try {
          customDetails = typeof item.custom_details === 'string' 
            ? JSON.parse(item.custom_details) 
            : item.custom_details;
        } catch (e) {
          console.error('Error parsing custom_details for mix item:', e);
          continue;
        }

        console.log('🔥 [DEBUG] Mix custom_details:', customDetails);

        if (customDetails && customDetails.mixItems && Array.isArray(customDetails.mixItems)) {
          console.log('🔥 [DEBUG] Found mixItems:', customDetails.mixItems);
          
          customDetails.mixItems.forEach((mixItem, index) => {
            const productId = parseInt(mixItem.id) || parseInt(mixItem.product_id);
            console.log('🔥 [DEBUG] Processing mixItem:', {
              name: mixItem.name,
              productId: productId,
              quantity: mixItem.calculatedQuantity
            });
            
            if (productId) {
              allocationItems.push({
                order_item_id: `${item.id}_mix_${index}`,
                product_id: productId,
                product_name: mixItem.name,
                quantity: parseFloat(mixItem.calculatedQuantity || mixItem.quantity || 0),
                unit: mixItem.unit || 'kg',
                price: parseFloat(mixItem.price || 0),
                source: 'mix',
                parent_mix_id: item.id,
                parent_mix_name: item.product_name,
                mix_number: customDetails.mixNumber || item.id.replace('mix-', ''),
                mix_details: customDetails
              });
            }
          });
        } else {
          console.warn('🔥 [DEBUG] No mixItems found in custom_details');
        }
      }
      // Handle regular items with product_id (but NOT mix containers)
      else if ((item.product_id || parseInt(item.id)) && item.source !== 'mix-calculator') {
        console.log('🔥 [DEBUG] Adding regular item:', item.product_name);
        allocationItems.push({
          order_item_id: item.id,
          product_id: item.product_id || parseInt(item.id) || null,
          product_name: item.product_name,
          quantity: parseFloat(item.quantity),
          unit: item.unit || 'kg',
          source: 'regular'
        });
      }
    }

    console.log('🔥 [DEBUG] Final allocation items:', allocationItems);
    return allocationItems.filter(i => i.product_id);
  }, [orderData]);

  // Auto-allocate function
  const autoAllocateForItem = (item) => {
    const batches = availableBatches[item.product_id] || [];
    const requiredQuantity = parseFloat(item.quantity);
    
    if (batches.length === 0) {
      showError(`No batches available for ${item.product_name}`);
      return;
    }

    let remainingQuantity = requiredQuantity;
    const newAllocations = [];

    const sortedBatches = [...batches].sort((a, b) => b.totalQuantity - a.totalQuantity);

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0.001) break;

      const availableInBatch = parseFloat(batch.totalQuantity);
      const quantityToAllocate = Math.min(remainingQuantity, availableInBatch);

      if (quantityToAllocate > 0.001) {
        newAllocations.push({
          order_item_id: item.order_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          batch: batch.batch,
          quantity: quantityToAllocate,
          unit: item.unit,
        });

        remainingQuantity -= quantityToAllocate;
      }
    }

    setAllocations(prev => ({
      ...prev,
      [item.order_item_id]: newAllocations
    }));

    if (remainingQuantity > 0.001) {
      showError(`Could not fully allocate ${item.product_name}. Missing ${remainingQuantity.toFixed(3)} ${item.unit}`);
    } else {
      showSuccess(`Auto-allocated ${item.product_name} successfully`);
    }
  };

  // Ensure we have full order details with items
  useEffect(() => {
    const ensureOrder = async () => {
      if (!isOpen) return;
      if (order?.items && order.items.length) {
        setOrderData(order);
        return;
      }
      if (order?.id) {
        try {
          setLoading(true);
          const res = await fetch(`http://localhost:5000/api/orders/${order.id}`);
          const data = await res.json();
          if (data.success) {
            console.log('🔥 [DEBUG] Loaded order data:', data.data);
            setOrderData(data.data);
          }
        } catch (e) {
          console.error(e);
          showError('Failed to load order details');
        } finally {
          setLoading(false);
        }
      }
    };
    ensureOrder();
  }, [isOpen, order?.id, showError]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const all = {};
        for (const item of itemsNeedingAllocation) {
          const res = await fetch(`http://localhost:5000/api/inventory/product/${item.product_id}/batches`);
          const data = await res.json();
          all[item.product_id] = (data.success ? data.data : []).map(b => ({
            batch: b.batch,
            totalQuantity: parseFloat(b.total_quantity),
            unit: b.unit,
          }));
        }
        setAvailableBatches(all);

        // Fetch existing allocations
        if (order?.id) {
          const res2 = await fetch(`http://localhost:5000/api/orders/${order.id}/allocations`);
          const data2 = await res2.json();
          if (data2.success && Array.isArray(data2.data) && data2.data.length) {
            const grouped = {};
            for (const a of data2.data) {
              if (!grouped[a.order_item_id]) grouped[a.order_item_id] = [];
              grouped[a.order_item_id].push(a);
            }
            setAllocations(grouped);
          } else {
            setAllocations({});
          }
        }
      } catch (e) {
        console.error(e);
        showError('Failed to load batches');
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen && itemsNeedingAllocation.length > 0) {
      fetchBatches();
    }
  }, [isOpen, itemsNeedingAllocation.length, order?.id, showError]);

  const totalAllocatedForItem = (orderItemId) => {
    const list = allocations[orderItemId] || [];
    return list.reduce((s, a) => s + (parseFloat(a.quantity) || 0), 0);
  };

  const updateAllocationQty = (orderItemId, idx, qty) => {
    setAllocations(prev => {
      const list = [...(prev[orderItemId] || [])];
      if (!list[idx]) return prev;
      list[idx] = { ...list[idx], quantity: qty };
      return { ...prev, [orderItemId]: list };
    });
  };

  const removeAllocation = (orderItemId, idx) => {
    setAllocations(prev => {
      const list = [...(prev[orderItemId] || [])];
      list.splice(idx, 1);
      return { ...prev, [orderItemId]: list };
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate allocations
      for (const it of itemsNeedingAllocation) {
        const required = parseFloat(it.quantity);
        const allocated = totalAllocatedForItem(it.order_item_id);
        if (Math.abs(allocated - required) > 0.0005) {
          showError(`Allocation mismatch for ${it.product_name}. Required ${required} ${it.unit}, allocated ${allocated} ${it.unit}.`);
          setLoading(false);
          return;
        }
      }

      const flat = Object.values(allocations).flat();
      const res = await fetch(`http://localhost:5000/api/orders/${order?.id}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: flat })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to save allocations');
      showSuccess('Allocations saved');
      onClose(true);
    } catch (e) {
      console.error(e);
      showError(e.message || 'Failed to save allocations');
    } finally {
      setLoading(false);
    }
  };

  // Handle batch selection from the dedicated dialog
  const handleBatchSelection = (selection) => {
    setAllocations(prev => ({
      ...prev,
      [selection.order_item_id]: selection.allocations.map(alloc => ({
        order_item_id: selection.order_item_id,
        product_id: selection.product_id,
        product_name: selection.product_name,
        batch: alloc.batch,
        quantity: alloc.quantity,
        unit: alloc.unit
      }))
    }));
  };

  // Open batch selection dialog for a specific product
  const openBatchSelection = (product) => {
    const currentAllocations = allocations[product.order_item_id] || [];
    setBatchSelectionDialog({
      isOpen: true,
      product: product,
      currentAllocations: currentAllocations
    });
  };

  // Group items by mix for simple display format
  const groupedItems = useMemo(() => {
    const groups = [];
    const regularItems = [];
    const mixGroups = {};
    
    itemsNeedingAllocation.forEach(item => {
      if (item.source === 'mix') {
        if (!mixGroups[item.parent_mix_id]) {
          mixGroups[item.parent_mix_id] = {
            type: 'mix',
            mix_id: item.parent_mix_id,
            mix_name: item.parent_mix_name,
            mix_number: item.mix_number,
            items: []
          };
        }
        mixGroups[item.parent_mix_id].items.push(item);
      } else {
        regularItems.push(item);
      }
    });

    // Add regular products first (excluding those that are also in mixes)
    const regularNonMixItems = regularItems.filter(item => {
      // Check if this item is also part of a mix
      return !itemsNeedingAllocation.some(mixItem => 
        mixItem.source === 'mix' && 
        mixItem.product_id === item.product_id
      );
    });

    if (regularNonMixItems.length > 0) {
      groups.push({
        type: 'regular',
        title: 'Regular Products',
        items: regularNonMixItems
      });
    }

    // Add mix groups
    Object.values(mixGroups).forEach(mixGroup => {
      groups.push(mixGroup);
    });
    
    console.log('🔥 [DEBUG] Grouped items:', groups);
    return groups;
  }, [itemsNeedingAllocation]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="space-y-3 p-6 pb-4 border-b border-gray-200">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="font-bold">Allocate Product Batches</div>
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                {itemsNeedingAllocation.length} items
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="text-sm text-gray-500 p-6">Loading...</div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-8">
              {groupedItems.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {/* Group Header */}
                  {group.type === 'regular' ? (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        {group.title}
                      </h3>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Mix {group.mix_number}
                      </h3>
                    </div>
                  )}

                  {/* Products List */}
                  <div className="space-y-4">
                    {group.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No items to allocate in this group</p>
                        <p className="text-sm">Check if mix items have valid product IDs</p>
                      </div>
                    ) : (
                      group.items.map((item, itemIndex) => {
                        const itemAllocs = allocations[item.order_item_id] || [];
                        const allocated = totalAllocatedForItem(item.order_item_id);
                        const remaining = Math.max(0, (parseFloat(item.quantity) || 0) - allocated);
                        const isFullyAllocated = remaining < 0.001;
                        
                        return (
                          <div key={item.order_item_id} className="bg-white border border-gray-200 rounded-lg p-4">
                            {/* Product Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {group.type === 'mix' && (
                                  <span className="text-orange-600 font-medium text-sm w-6">
                                    {itemIndex + 1}.
                                  </span>
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">{item.product_name}</div>
                                  <div className="text-sm text-gray-500">
                                    Quantity: {item.quantity} {item.unit}
                                    {item.price && ` • Price: ${formatCurrency(item.price)}/${item.unit}`}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className={`text-sm px-3 py-1 rounded-full ${
                                  isFullyAllocated
                                    ? 'text-green-700 bg-green-100'
                                    : 'text-orange-600 bg-orange-100'
                                }`}>
                                  {isFullyAllocated ? 'Allocated' : `Remaining: ${remaining.toFixed(3)} ${item.unit}`}
                                </div>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openBatchSelection(item)}
                                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                >
                                  Select Batches
                                </Button>
                              </div>
                            </div>

                            {/* Current Allocations */}
                            {itemAllocs.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="text-sm font-medium text-gray-700 mb-2">Current Allocations:</div>
                                <div className="space-y-2">
                                  {itemAllocs.map((alloc, idx) => (
                                    <div key={`${alloc.batch}-${idx}`} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                      <span className="font-mono">{alloc.batch}</span>
                                      <span>{alloc.quantity} {alloc.unit}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center p-6 pt-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {loading && (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Loading...</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onClose(false)} className="px-6">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="px-6 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Allocations
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Selection Dialog */}
      {batchSelectionDialog.isOpen && batchSelectionDialog.product && (
        <BatchSelectionDialog
          isOpen={batchSelectionDialog.isOpen}
          onClose={() => setBatchSelectionDialog({ isOpen: false, product: null, currentAllocations: [] })}
          product={batchSelectionDialog.product}
          availableBatches={availableBatches[batchSelectionDialog.product.product_id] || []}
          currentAllocations={batchSelectionDialog.currentAllocations}
          onBatchSelection={handleBatchSelection}
        />
      )}
    </>
  );
}

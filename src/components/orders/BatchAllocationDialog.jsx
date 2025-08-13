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

  const itemsNeedingAllocation = useMemo(() => {
    const items = orderData?.items || [];
    const allocationItems = [];

    for (const item of items) {
      // Handle regular items with product_id
      if (item.product_id || parseInt(item.id)) {
        allocationItems.push({
          order_item_id: item.id,
          product_id: item.product_id || parseInt(item.id) || null,
          product_name: item.product_name,
          quantity: parseFloat(item.quantity),
          unit: item.unit || 'kg',
          source: 'regular'
        });
      }
      
      // Handle mix items - extract individual products from custom_details
      else if (item.source === 'mix-calculator' && item.custom_details) {
        let customDetails;
        try {
          customDetails = typeof item.custom_details === 'string' 
            ? JSON.parse(item.custom_details) 
            : item.custom_details;
        } catch (e) {
          console.error('Error parsing custom_details for mix item:', e);
          continue;
        }

        if (customDetails && customDetails.mixItems && Array.isArray(customDetails.mixItems)) {
          customDetails.mixItems.forEach((mixItem, index) => {
            const productId = parseInt(mixItem.id) || parseInt(mixItem.product_id);
            if (productId) {
              allocationItems.push({
                order_item_id: `${item.id}_mix_${index}`,
                product_id: productId,
                product_name: mixItem.name,
                quantity: parseFloat(mixItem.calculatedQuantity || mixItem.quantity || 0),
                unit: mixItem.unit || 'kg',
                source: 'mix',
                parent_mix_id: item.id,
                parent_mix_name: item.product_name,
                mix_number: customDetails.mixNumber || item.id.replace('mix-', ''),
                mix_details: customDetails
              });
            }
          });
        }
      }
    }

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
          if (data.success) setOrderData(data.data);
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

  // Group items by mix for better display
  const groupedItems = useMemo(() => {
    const groups = {};
    const regularItems = [];
    const mixGroups = {};
    
    itemsNeedingAllocation.forEach(item => {
      if (item.source === 'mix') {
        // Group by parent mix
        if (!mixGroups[item.parent_mix_id]) {
          mixGroups[item.parent_mix_id] = {
            type: 'mix',
            parent_mix_id: item.parent_mix_id,
            parent_mix_name: item.parent_mix_name,
            mix_number: item.mix_number,
            title: `${item.parent_mix_name} (Mix ${item.mix_number})`,
            totalBudget: item.mix_details?.totalBudget || 0,
            totalWeight: item.mix_details?.totalWeight || 0,
            items: []
          };
        }
        mixGroups[item.parent_mix_id].items.push(item);
      } else {
        regularItems.push(item);
      }
    });

    // Create regular products section
    if (regularItems.length > 0) {
      groups['regular_products'] = {
        type: 'regular_products',
        title: 'Regular Products',
        description: 'Individual products that need batch allocation',
        items: regularItems
      };
    }

    // Create mix sections - showing products inside each mix
    Object.values(mixGroups).forEach(mixGroup => {
      groups[`mix_${mixGroup.parent_mix_id}`] = mixGroup;
    });
    
    return Object.values(groups);
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
            <div className="space-y-6">
              {groupedItems.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* Section Header */}
                  <div className={`rounded-lg p-4 ${
                    group.type === 'regular_products'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {group.type === 'regular_products' ? (
                          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        )}
                        <h3 className={`font-medium ${
                          group.type === 'regular_products'
                            ? 'text-blue-800'
                            : 'text-orange-800'
                        }`}>
                          {group.title}
                        </h3>
                        {group.type === 'mix' && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-orange-100 text-orange-700">
                              {group.items.length} products
                            </Badge>
                            <Badge variant="outline" className="bg-orange-100 text-orange-700">
                              {formatCurrency(group.totalBudget)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {group.description && (
                        <p className={`text-sm ${
                          group.type === 'regular_products'
                            ? 'text-blue-600'
                            : 'text-orange-600'
                        }`}>
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {group.items.map((item) => {
                    const batches = availableBatches[item.product_id] || [];
                    const itemAllocs = allocations[item.order_item_id] || [];
                    const allocated = totalAllocatedForItem(item.order_item_id);
                    const remaining = Math.max(0, (parseFloat(item.quantity) || 0) - allocated);
                    const isFullyAllocated = remaining < 0.001;
                    
                    return (
                      <div key={item.order_item_id} className={`border rounded-lg p-5 bg-white shadow-sm ${
                        group.type === 'mix' ? 'border-orange-200 ml-4' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {group.type === 'mix' && (
                              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                            )}
                            <div className="font-semibold text-lg">{item.product_name}</div>
                            {group.type === 'mix' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                  Mix Product
                                </span>
                                {item.allocated_cost && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {formatCurrency(item.allocated_cost)} allocated
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`text-sm px-3 py-1 rounded-full ${
                              isFullyAllocated
                                ? 'text-green-700 bg-green-50'
                                : 'text-gray-600 bg-gray-50'
                            }`}>
                              Required: {item.quantity} {item.unit} | Remaining: {remaining.toFixed(3)} {item.unit}
                            </div>
                            <div className="flex gap-2">
                              {!isFullyAllocated && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => autoAllocateForItem(item)}
                                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                >
                                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Auto Allocate
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openBatchSelection(item)}
                                className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                              >
                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Select Batches
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Current Allocations - Only show if allocations exist */}
                        {itemAllocs.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                              <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Current Allocations
                            </div>
                            {itemAllocs.map((a, idx) => (
                              <div key={`${a.batch}-${idx}`} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="font-mono text-sm font-medium text-green-700 w-32">{a.batch}</div>
                                <div className="flex-1 flex items-center gap-2">
                                  <QuantityInput
                                    value={a.quantity}
                                    onChange={(q) => updateAllocationQty(item.order_item_id, idx, q)}
                                  />
                                  <div className="text-sm text-gray-500">{item.unit}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAllocation(item.order_item_id, idx)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

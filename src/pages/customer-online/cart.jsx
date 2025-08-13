import React, { useState } from 'react';
import { Minus, Plus, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react';

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
  return `₹${amount.toFixed(2)}`;
}

function getCartTotal(cart) {
  return cart.reduce((total, item) => {
    // Use exact entered amount for custom price items
    if (item.isCustom && item.originalEnteredAmount) {
      return total + item.originalEnteredAmount;
    }
    return total + (item.price * item.quantity);
  }, 0);
}

function CartView({ cart, onQuantityChange, onBackToProducts, onProceedToCheckout, onClearCart }) {
  const [expandedMixes, setExpandedMixes] = useState(new Set());

  // Updated: Helper function to format quantity display
  const formatQuantityDisplay = (item) => {
    const unit = item.unit || 'kg';
    const quantity = Number(item.quantity);
    
    if (item.isMix) {
      // Return empty string to remove "1 mix" display
      return '';
    }
    
    if (quantity !== Math.floor(quantity)) {
      return `${quantity.toFixed(3)} ${unit}`;
    }
    return `${quantity} ${unit}`;
  };

  const formatUnitPriceDisplay = (item) => {
    if (item.isMix) {
      const itemCount = item.custom_details?.itemCount || item.mixDetails?.itemCount || 0;
      return `Mix of ${itemCount} items`;
    }
    const unit = item.unit || 'kg';

    // For custom price items, show the original retail price
    if (item.isCustom && item.originalRetailPrice) {
      return `${formatCurrency(item.originalRetailPrice)} per ${unit}`;
    }

    const price = Number(item.price);
    return `${formatCurrency(price)} per ${unit}`;
  };

  // Helper function to calculate subtotal - use exact entered amount for custom price items
  const calculateSubtotal = (item) => {
    if (item.isCustom && item.originalEnteredAmount) {
      return item.originalEnteredAmount;
    }
    return item.price * item.quantity;
  };

  const toggleMixExpansion = (mixId) => {
    setExpandedMixes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mixId)) {
        newSet.delete(mixId);
      } else {
        newSet.add(mixId);
      }
      return newSet;
    });
  };

  const handleMixQuantityChange = (item, newQuantity) => {
    if (newQuantity <= 0) {
      onQuantityChange(item.id, 0); // Remove the mix
    }
    // For mix items, only removal is allowed
  };

  const renderMixDetails = (item) => {
    if (!item.isMix) return null;
    
    const mixDetails = item.custom_details || item.mixDetails;
    if (!mixDetails) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => toggleMixExpansion(item.id)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {expandedMixes.has(item.id) ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span>View mix details ({mixDetails.itemCount} items)</span>
        </button>

        {expandedMixes.has(item.id) && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="text-xs text-gray-600 mb-2">
              <strong>Budget:</strong> {formatCurrency(mixDetails.totalBudget)} •
              <strong className="ml-1">Actual Cost:</strong> {formatCurrency(item.price)}
            </div>
            
            {mixDetails.mixItems?.map((mixItem, index) => (
              <div key={index} className="flex justify-between items-center text-sm border-b border-gray-200 pb-1 last:border-b-0">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{mixItem.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(mixItem.price || mixItem.retail_price)} per {mixItem.unit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-orange-600">
                    {mixItem.calculatedQuantity} {mixItem.unit}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(mixItem.actualCost)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={onBackToProducts}
          className="text-orange-600 hover:text-orange-700 mb-4 flex items-center gap-2 hover-lift transition-all duration-300"
        >
          ← Continue Shopping
        </button>
        <h1 className="text-3xl font-bold text-gray-900 gradient-text">Shopping Cart</h1>
        <p className="text-gray-600 mt-2">
          {cart.length === 0 ? 'Your cart is empty' : `${cart.length} item${cart.length !== 1 ? 's' : ''} in your cart`}
        </p>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold mb-4 mt-2 hover-lift"
            type="button"
          >
            <Trash2 className="h-5 w-5" />
            Clear Cart
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-16 bounce-in">
          <div className="text-gray-400 text-6xl mb-4">🛒</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h3>
          <p className="text-gray-500 mb-6">Add some delicious spices to get started!</p>
          <button
            onClick={onBackToProducts}
            className="btn-shimmer px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors magnetic-hover"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, index) => (
              <div 
                key={item.id} 
                className={`product-card-hover bg-white p-6 rounded-lg shadow-md border border-gray-100 stagger-${Math.min((index % 3) + 1, 3)} ${
                  item.isMix ? 'border-l-4 border-l-green-500' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {item.isMix ? (
                      <Package className="h-8 w-8 text-green-600" />
                    ) : (
                      <img
                        src={item.image || 'https://placehold.co/64x64?text=No+Image'}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg transition-transform duration-300 hover:scale-110"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/64x64?text=No+Image';
                        }}
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      {item.displayName || item.name}
                      {item.isMix && (
                        <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                          Mix Packet
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600 text-sm">{formatUnitPriceDisplay(item)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      {item.isMix ? (
                        // Hide quantity block entirely for mixes (empty string from formatQuantityDisplay)
                        <></>
                      ) : (
                        <>
                          <button
                            onClick={() => onQuantityChange(item.id, item.quantity - 0.1)}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover-lift transition-all duration-300"
                            disabled={item.quantity <= 0.1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          
                          <div className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-lg font-medium min-w-[4rem] text-center text-sm">
                            <div className="font-semibold text-orange-700">
                              {formatQuantityDisplay(item)}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => onQuantityChange(item.id, item.quantity + 0.1)}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover-lift transition-all duration-300"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="font-semibold text-lg text-orange-600">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Total
                      </p>
                    </div>

                    <button
                      onClick={() => item.isMix ? handleMixQuantityChange(item, 0) : onQuantityChange(item.id, 0)}
                      className="w-8 h-8 rounded-lg border border-red-300 flex items-center justify-center hover:bg-red-50 text-red-500 hover:text-red-700 transition-all duration-300 hover-lift"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {item.isMix ? (
                  renderMixDetails(item)
                ) : (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Quantity: {formatQuantityDisplay(item)}</span>
                      <span>Unit Price: {formatUnitPriceDisplay(item)}</span>
                      <span className="font-medium text-gray-900">
                        Subtotal: {formatCurrency(calculateSubtotal(item))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 sticky top-4 hover-lift glow-effect">
              <h3 className="text-xl font-semibold mb-4 gradient-text">Order Summary</h3>

              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto scrollbar-hide">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span className="truncate mr-2 flex items-center gap-1">
                      {item.isMix && <Package className="h-3 w-3 text-green-600" />}
                      {item.name} 
                      {/* Don't show quantity of mix here */}
                      {!item.isMix && <>× {formatQuantityDisplay(item)}</>}
                    </span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(calculateSubtotal(item))}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="my-4" />

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(getCartTotal(cart))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className={getCartTotal(cart) >= 500 ? 'text-green-600 font-medium' : ''}>
                    {getCartTotal(cart) >= 500 ? 'Free' : formatCurrency(50)}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-orange-600 gradient-text">
                    {formatCurrency(getCartTotal(cart) + (getCartTotal(cart) >= 500 ? 0 : 50))}
                  </span>
                </div>
              </div>

              {getCartTotal(cart) < 500 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 slide-in-bottom">
                  <p className="text-sm text-orange-700 font-medium">
                    🚚 Add {formatCurrency(500 - getCartTotal(cart))} more for free delivery!
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((getCartTotal(cart) / 500) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={onProceedToCheckout}
                className="btn-shimmer w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold text-lg magnetic-hover"
              >
                Proceed to Checkout
              </button>

              <p className="text-xs text-gray-500 mt-2 text-center">
                Secure checkout with order confirmation
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartView;

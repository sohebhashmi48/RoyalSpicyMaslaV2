import React, { useState } from 'react';
import { ArrowLeft, Phone, Mail, MapPin, Package, Clock, CheckCircle } from 'lucide-react';

function OrderSummary({ cart, onBackToCart, onOrderComplete }) {
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const [orderStatus, setOrderStatus] = useState('form'); // 'form', 'processing', 'success'
  const [errors, setErrors] = useState({});

  // Format currency
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  // Format quantity for display
  const formatQuantity = (qty) => {
    const numQty = parseFloat(qty);
    return isNaN(numQty) ? '0.000' : numQty.toFixed(3);
  };

  // Calculate totals
  const getCartSubtotal = () => {
    return cart.reduce((total, item) => {
      // Use exact entered amount for custom price items
      if (item.isCustom && item.originalEnteredAmount) {
        return total + item.originalEnteredAmount;
      }
      return total + (item.price * item.quantity);
    }, 0);
  };

  const getDeliveryFee = () => {
    const subtotal = getCartSubtotal();
    return subtotal >= 500 ? 0 : 50;
  };

  const getCartTotal = () => {
    return getCartSubtotal() + getDeliveryFee();
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!customerDetails.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!customerDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(customerDetails.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!customerDetails.address.trim()) {
      newErrors.address = 'Delivery address is required';
    }

    if (customerDetails.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerDetails.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Generate WhatsApp message
  const generateWhatsAppMessage = () => {
    let message = `🛒 *New Order from RoyalSpicyMasala*\n\n`;
    message += `👤 *Customer Details:*\n`;
    message += `Name: ${customerDetails.name}\n`;
    message += `Phone: ${customerDetails.phone}\n`;
    if (customerDetails.email) message += `Email: ${customerDetails.email}\n`;
    message += `Address: ${customerDetails.address}\n\n`;

    message += `📦 *Order Items:*\n`;
    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   Quantity: ${item.quantity} ${item.unit || 'kg'}\n`;

      // Show original retail price for custom price items
      const displayPrice = (item.isCustom && item.originalRetailPrice) ? item.originalRetailPrice : item.price;
      message += `   Price: ${formatCurrency(displayPrice)} per ${item.unit || 'kg'}\n`;

      // Use exact entered amount for custom price items
      const itemTotal = (item.isCustom && item.originalEnteredAmount) ? item.originalEnteredAmount : (item.price * item.quantity);
      message += `   Total: ${formatCurrency(itemTotal)}\n`;

      // Handle mix items specially - show detailed components
      if (item.source === 'mix-calculator' && item.custom_details && item.custom_details.mixItems) {
        message += `   🌶️ *Mix Components:*\n`;
        item.custom_details.mixItems.forEach((mixItem, mixIndex) => {
          message += `      ${String.fromCharCode(97 + mixIndex)}. ${mixItem.name}\n`;
          message += `         Qty: ${formatQuantity(mixItem.calculatedQuantity || mixItem.quantity || 0)} ${mixItem.unit || 'kg'}\n`;
          message += `         @ ${formatCurrency(mixItem.price || 0)}/${mixItem.unit || 'kg'}\n`;
        });
        message += `   📊 *Mix Total: ${formatQuantity(item.custom_details.totalWeight || item.quantity)} kg*\n`;
      }

      if (item.isCustom) message += `   ⚠️ *Custom Order*\n`;
      message += `\n`;
    });

    message += `💰 *Order Summary:*\n`;
    message += `Subtotal: ${formatCurrency(getCartSubtotal())}\n`;
    message += `Delivery: ${getDeliveryFee() === 0 ? 'Free' : formatCurrency(getDeliveryFee())}\n`;
    message += `*Total: ${formatCurrency(getCartTotal())}*\n\n`;

    if (customerDetails.notes) {
      message += `📝 *Special Instructions:*\n${customerDetails.notes}\n\n`;
    }

    message += `🕒 Order placed on: ${new Date().toLocaleString()}\n`;
    message += `Please confirm this order. Thank you! 🙏`;

    return encodeURIComponent(message);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setOrderStatus('processing');

    try {
      // Prepare order data with proper JSON formatting
      const orderData = {
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
        customer_email: customerDetails.email,
        delivery_address: customerDetails.address,
        notes: customerDetails.notes,
        cart_items: cart,
        subtotal: getCartSubtotal(),
        delivery_fee: getDeliveryFee(),
        total_amount: getCartTotal(),
        order_source: 'online'
      };

      // Submit order to database
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      
      const result = await response.json();

      if (result.success) {
        // Generate WhatsApp message
        const whatsappMessage = generateWhatsAppMessage();
        const whatsappUrl = `https://wa.me/919702713157?text=${whatsappMessage}`;

        // Open WhatsApp
        window.open(whatsappUrl, '_blank');

        setOrderStatus('success');

        // Auto-complete order after showing success
        setTimeout(() => {
          onOrderComplete();
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setOrderStatus('form');
      setErrors({ submit: 'Failed to submit order. Please try again.' });
    }
  };

  // Render processing state
  if (orderStatus === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Your Order</h2>
          <p className="text-gray-600">Please wait while we prepare your order details...</p>
        </div>
      </div>
    );
  }

  // Render success state
  if (orderStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full mx-4">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Sent Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your order has been sent via WhatsApp. We'll contact you shortly for confirmation.
          </p>
          <div className="text-sm text-gray-500">
            Redirecting to products page...
          </div>
        </div>
      </div>
    );
  }

  // Main form render
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBackToCart}
            className="text-orange-600 hover:text-orange-700 mb-4 flex items-center gap-2 hover:translate-x-1 transition-all duration-300 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Summary</h1>
          <p className="text-gray-600">Complete your order details and place your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Details Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm shadow-xl">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Customer Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="sm:col-span-1">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={customerDetails.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300 ${
                        errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="sm:col-span-1">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={customerDetails.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300 ${
                        errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter 10-digit mobile number"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={customerDetails.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300 ${
                        errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Delivery Address */}
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Address *
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      required
                      rows={3}
                      value={customerDetails.address}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300 resize-none ${
                        errors.address ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter your complete delivery address including area, landmark, and pincode"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                    )}
                  </div>

                  {/* Order Notes */}
                  <div className="sm:col-span-2">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Order Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={2}
                      value={customerDetails.notes}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300 resize-none"
                      placeholder="Any special instructions for your order (delivery time, specific requirements, etc.)"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={cart.length === 0 || orderStatus === 'processing'}
                className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                {orderStatus === 'processing' ? 'Processing...' : 'Place Order via WhatsApp'}
              </button>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm shadow-xl sticky top-4">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Order Summary
              </h3>

              {/* Cart Items */}
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-100">
                    <div className="flex-1 pr-3">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {item.displayName || item.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {item.quantity} {item.unit || 'kg'} × {formatCurrency((item.isCustom && item.originalRetailPrice) ? item.originalRetailPrice : item.price)}
                      </p>
                      {item.isCustom && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          Custom Order
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-orange-600">
                        {formatCurrency((item.isCustom && item.originalEnteredAmount) ? item.originalEnteredAmount : (item.price * item.quantity))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>{formatCurrency(getCartSubtotal())}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span className={getDeliveryFee() === 0 ? 'text-green-600 font-medium' : ''}>
                    {getDeliveryFee() === 0 ? 'Free' : formatCurrency(getDeliveryFee())}
                  </span>
                </div>
                {getCartSubtotal() < 500 && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    💡 Add {formatCurrency(500 - getCartSubtotal())} more for free delivery!
                  </p>
                )}
                <hr />
                <div className="flex justify-between font-bold text-lg text-gray-900">
                  <span>Total</span>
                  <span className="text-orange-600">{formatCurrency(getCartTotal())}</span>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Information
                </h4>
                <div className="text-sm text-orange-700 space-y-1">
                  <p>• Estimated delivery: 2-4 hours</p>
                  <p>• Free delivery on orders ₹500+</p>
                  <p>• Cash on delivery available</p>
                  <p>• WhatsApp confirmation required</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderSummary;

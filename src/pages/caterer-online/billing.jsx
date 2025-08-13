import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ArrowLeft,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle,
  Info
} from 'lucide-react';

function BillingView({
  cart,
  selectedCaterer,
  onBackToCatererSelection,
  onOrderComplete,
  getCartSubtotal,
  getDeliveryFee,
  getCartTotal
}) {
  const [billingStatus, setBillingStatus] = useState('form'); // 'form', 'processing', 'success'
  const [submitError, setSubmitError] = useState('');
  const [orderResponse, setOrderResponse] = useState(null);

  const [paymentAmount, setPaymentAmount] = useState('full'); // 'full', 'half', 'custom', 'later'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'upi', 'card', 'bank_transfer', 'cheque'
  const [customAmount, setCustomAmount] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

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

  // Get payment amount based on selected amount option
  const getPaymentAmount = () => {
    switch (paymentAmount) {
      case 'full':
        return getCartTotal();
      case 'half':
        return getCartTotal() / 2;
      case 'custom':
        return parseFloat(customAmount) || 0;
      case 'later':
        return 0;
      default:
        return getCartTotal();
    }
  };

  // Get remaining amount
  const getRemainingAmount = () => {
    return getCartTotal() - getPaymentAmount();
  };

  // Get payment status for display
  const getPaymentStatusForDisplay = () => {
    const paidAmount = getPaymentAmount();
    const totalAmount = getCartTotal();
    
    if (paidAmount >= totalAmount) return 'Fully Paid';
    if (paidAmount > 0) return 'Partially Paid';
    return 'Payment Pending';
  };

  // Generate WhatsApp message for caterer
  const generateCatererWhatsAppMessage = () => {
    let message = `🛒 *New Order for ${selectedCaterer.caterer_name}*\n\n`;
    message += `🏢 *Caterer Details:*\n`;
    message += `Name: ${selectedCaterer.caterer_name}\n`;
    message += `Contact: ${selectedCaterer.contact_person}\n`;
    message += `Phone: ${selectedCaterer.phone_number}\n`;
    if (selectedCaterer.email) message += `Email: ${selectedCaterer.email}\n`;
    message += `Address: ${selectedCaterer.address}\n\n`;

    message += `📦 *Order Items:*\n`;
    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.displayName || item.name}\n`;
      message += `   Quantity: ${item.quantity} ${item.unit || 'kg'}\n`;
      message += `   Price: ₹${item.price} per ${item.unit || 'kg'}\n`;

      const itemTotal = item.originalEnteredAmount || (item.price * item.quantity);
      message += `   Total: ₹${itemTotal.toFixed(2)}\n`;

      // Handle mix items specially - show detailed components
      if (item.source === 'mix-calculator' && item.custom_details && item.custom_details.mixItems) {
        message += `   🌶️ *Mix Components:*\n`;
        item.custom_details.mixItems.forEach((mixItem, mixIndex) => {
          message += `      ${String.fromCharCode(97 + mixIndex)}. ${mixItem.name}\n`;
          message += `         Qty: ${formatQuantity(mixItem.calculatedQuantity || mixItem.quantity || 0)} ${mixItem.unit || 'kg'}\n`;
          message += `         @ ₹${mixItem.price || 0}/${mixItem.unit || 'kg'}\n`;
        });
        message += `   📊 *Mix Total: ${formatQuantity(item.custom_details.totalWeight || item.quantity)} kg*\n`;
      } else if (item.isMix) {
        message += `   🔄 *Mix Item*\n`;
      }
      
      if (item.isCustom) message += `   ⚠️ *Custom Order*\n`;
      message += `\n`;
    });

    message += `💰 *Order Summary:*\n`;
    message += `Subtotal: ₹${getCartSubtotal().toFixed(2)}\n`;
    message += `Delivery: ${getDeliveryFee() === 0 ? 'Free' : `₹${getDeliveryFee().toFixed(2)}`}\n`;
    message += `*Total: ₹${getCartTotal().toFixed(2)}*\n\n`;

    message += `💳 *Payment Details:*\n`;
    message += `Payment Method: ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}\n`;
    message += `Advance Payment: ₹${getPaymentAmount().toFixed(2)}\n`;
    if (getRemainingAmount() > 0) {
      message += `Balance Due: ₹${getRemainingAmount().toFixed(2)} (Pay on delivery)\n`;
    }
    message += `Payment Status: ${getPaymentStatusForDisplay()}\n\n`;

    message += `🕒 Order placed on: ${new Date().toLocaleString()}\n`;
    if (orderResponse && orderResponse.data && orderResponse.data.order_number) {
      message += `📋 Order Number: ${orderResponse.data.order_number}\n\n`;
    }
    
    message += `📋 *Next Steps:*\n`;
    message += `1. Please confirm this order\n`;
    message += `2. Prepare the items as per requirement\n`;
    message += `3. Bill will be generated on delivery\n`;
    if (getRemainingAmount() > 0) {
      message += `4. Collect balance payment: ₹${getRemainingAmount().toFixed(2)}\n`;
    }
    message += `\nThank you for your business! 🙏`;

    return encodeURIComponent(message);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setBillingStatus('processing');

    try {
      // Validate payment amount selection
      if (paymentAmount === 'custom' && (!customAmount || parseFloat(customAmount) <= 0)) {
        setSubmitError('Please enter a valid payment amount');
        setBillingStatus('form');
        return;
      }

      if (paymentAmount === 'custom' && parseFloat(customAmount) > getCartTotal()) {
        setSubmitError('Payment amount cannot exceed order total');
        setBillingStatus('form');
        return;
      }

      // Calculate payment details
      const paymentAmountValue = getPaymentAmount();
      
      // Validate payment amount doesn't exceed total
      if (paymentAmountValue > getCartTotal()) {
        setSubmitError(`Payment amount (₹${paymentAmountValue.toFixed(2)}) cannot exceed order total (₹${getCartTotal().toFixed(2)})`);
        setBillingStatus('form');
        return;
      }

      // Prepare order data for API - Updated for new flow
      const orderData = {
        caterer_name: selectedCaterer.caterer_name,
        contact_person: selectedCaterer.contact_person,
        caterer_phone: selectedCaterer.phone_number,
        caterer_email: selectedCaterer.email || null,
        caterer_address: selectedCaterer.address,
        gst_number: selectedCaterer.gst_number || null,
        notes: null,
        cart_items: cart.map(item => ({
          product_id: item.isMix ? null : (item.product_id || null),
          name: item.displayName || item.name,
          quantity: item.quantity,
          unit: item.unit || 'kg',
          price: item.price,
          originalEnteredAmount: item.originalEnteredAmount || (item.price * item.quantity),
          isMix: item.isMix || false,
          isCustom: item.isCustom || false,
          mixNumber: item.mixNumber || (item.isMix ? item.id.replace('mix-', '') : null),
          mixDetails: item.mixDetails || null,
          components: item.components || null,
          customDetails: item.customDetails || null
        })),
        subtotal: getCartSubtotal(),
        delivery_fee: getDeliveryFee(),
        total_amount: getCartTotal(),
        order_source: 'caterer_online',
        payment_amount: paymentAmountValue, // Advance payment amount
        payment_method: paymentMethod
      };

      console.log('📤 [BILLING VIEW] Order creation - Payment calculation:', {
        selectedPaymentAmount: paymentAmount,
        calculatedAdvancePayment: paymentAmountValue,
        orderTotal: getCartTotal(),
        balanceAmount: getRemainingAmount(),
        paymentMethod: paymentMethod,
        paymentStatus: getPaymentStatusForDisplay()
      });

      console.log(orderData.total_amount)
      
      console.log('📤 [BILLING VIEW] Sending order data (no bill creation yet):', orderData);

      // Create caterer order via API (no bills created at this stage)
      const response = await fetch('http://localhost:5000/api/caterer-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to create caterer order');
      }

      console.log('✅ [BILLING VIEW] Order created successfully (no bill yet):', result);
      setOrderResponse(result);

      // If an advance was paid and a receipt image was provided, record the payment with receipt
      if (getPaymentAmount() > 0 && receiptImage) {
        try {
          setIsUploadingReceipt(true);
          const formData = new FormData();
          formData.append('order_id', result.data.id);
          formData.append('amount', getPaymentAmount());
          formData.append('paymentMethod', paymentMethod);
          formData.append('referenceNumber', `ADV-${result.data.order_number}`);
          formData.append('notes', `Advance payment for order ${result.data.order_number}`);
          formData.append('receipt_image', receiptImage);

          const payRes = await fetch('http://localhost:5000/api/caterer-orders/payments', {
            method: 'POST',
            body: formData
          });
          const payJson = await payRes.json();
          if (!payJson.success) {
            console.error('❌ [BILLING VIEW] Failed to upload receipt/payment:', payJson);
            setSubmitError('Order created but failed to upload receipt. You can upload it later from the bill.');
          }
        } catch (err) {
          console.error('❌ [BILLING VIEW] Error uploading receipt/payment:', err);
          setSubmitError('Order created but failed to upload receipt. You can upload it later from the bill.');
        } finally {
          setIsUploadingReceipt(false);
        }
      }

      // Generate WhatsApp message and send to caterer
      const whatsappMessage = generateCatererWhatsAppMessage();
      const whatsappUrl = `https://wa.me/${selectedCaterer.phone_number.replace(/\D/g, '')}?text=${whatsappMessage}`;

      // Open WhatsApp
      window.open(whatsappUrl, '_blank');

      setBillingStatus('success');

      // Auto-complete order after showing success
      setTimeout(() => {
        onOrderComplete();
      }, 4000);
    } catch (error) {
      console.error('❌ [BILLING VIEW] Error creating order:', error);
      setBillingStatus('form');
      setSubmitError(error.message || 'Failed to create order. Please try again.');
    }
  };

  if (billingStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full mx-4">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Placed Successfully!</h2>
          
          {orderResponse && orderResponse.data && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="font-semibold text-gray-900">{orderResponse.data.order_number}</p>
            </div>
          )}
          
          <p className="text-gray-600 mb-4">
            Your order has been sent to the caterer via WhatsApp. They will contact you shortly for confirmation.
          </p>
          
          {/* Updated Payment Summary */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Order Summary</div>
            <div className="flex justify-between text-sm">
              <span>Total Amount:</span>
              <span className="font-medium">{formatCurrency(getCartTotal())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Advance Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(getPaymentAmount())}</span>
            </div>
            {getRemainingAmount() > 0 && (
              <div className="flex justify-between text-sm">
                <span>Balance Due:</span>
                <span className="font-medium text-orange-600">{formatCurrency(getRemainingAmount())}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mt-2 pt-2 border-t">
              <span>Status:</span>
              <span className="font-medium">{getPaymentStatusForDisplay()}</span>
            </div>
          </div>

          {/* Updated Billing Information */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Billing Process:</p>
                <p>• Invoice will be generated when order is delivered</p>
                {getRemainingAmount() > 0 && (
                  <p>• Balance payment due on delivery</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Redirecting to products page...
          </div>
        </div>
      </div>
    );
  }

  // Main form render (rest of the component remains mostly the same)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="responsive-container py-4 md:py-6">
          <button
            onClick={onBackToCatererSelection}
            className="text-orange-600 hover:text-orange-700 mb-4 flex mt-4 items-center gap-2 hover:translate-x-1 transition-all duration-300 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Caterer Selection
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Place Order</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">Complete your order for {selectedCaterer.caterer_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Order Total</p>
              <p className="text-xl md:text-2xl font-bold text-orange-600">{formatCurrency(getCartTotal())}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="responsive-container py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-600" />
                Advance Payment Details
              </h3>

              {/* Updated Information Box */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Payment & Billing Process:</p>
                    <ul className="mt-2 space-y-1">
                      <li>• Choose your advance payment amount (or pay later)</li>
                      <li>• Order will be sent to caterer for confirmation</li>
                      <li>• Official invoice will be generated on delivery</li>
                      <li>• Balance payment (if any) due on delivery</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Advance Payment Amount <span className="text-orange-600">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['full', 'half', 'later', 'custom'].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setPaymentAmount(amount)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        paymentAmount === amount
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {amount === 'full' && 'Pay Full'}
                        {amount === 'half' && 'Pay Half'}
                        {amount === 'later' && 'Pay Later'}
                        {amount === 'custom' && 'Custom Amount'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {amount === 'full' && formatCurrency(getCartTotal())}
                        {amount === 'half' && formatCurrency(getCartTotal() / 2)}
                        {amount === 'later' && 'No advance'}
                        {amount === 'custom' && 'Enter amount'}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select advance payment amount. Balance (if any) will be due on delivery when the invoice is generated.
                </p>
              </div>

              {/* Custom Amount Input */}
              {paymentAmount === 'custom' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advance Payment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={getCartTotal()}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum: {formatCurrency(getCartTotal())}
                  </p>
                </div>
              )}

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: 'cash', label: 'Cash', desc: 'Pay by cash' },
                    { id: 'upi', label: 'UPI', desc: 'Pay by UPI' },
                    { id: 'card', label: 'Card', desc: 'Pay by card' },
                    { id: 'bank_transfer', label: 'Bank Transfer', desc: 'Bank transfer' },
                    { id: 'cheque', label: 'Cheque', desc: 'Pay by cheque' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        paymentMethod === method.id
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">{method.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{method.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Receipt Upload (optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Receipt (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) { setReceiptImage(null); return; }
                    if (!file.type.startsWith('image/')) {
                      setSubmitError('Please upload a valid image file');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setSubmitError('Receipt image must be less than 5MB');
                      return;
                    }
                    setSubmitError('');
                    setReceiptImage(file);
                  }}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
                {receiptImage && (
                  <p className="mt-2 text-xs text-gray-500">Selected: {receiptImage.name}</p>
                )}
                {getPaymentAmount() === 0 && (
                  <p className="mt-1 text-xs text-gray-500">Receipt will be attached to the advance payment. Currently no advance selected.</p>
                )}
              </div>

              {/* Updated Payment Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Payment Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Order Total:</span>
                    <span className="font-medium">{formatCurrency(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Advance Payment:</span>
                    <span className="font-medium text-green-600">{formatCurrency(getPaymentAmount())}</span>
                  </div>
                  {getRemainingAmount() > 0 && (
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm text-gray-600">Balance Due on Delivery:</span>
                      <span className="font-medium text-orange-600">{formatCurrency(getRemainingAmount())}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm text-gray-600">Order Status:</span>
                    <span className="font-medium">{getPaymentStatusForDisplay()}</span>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                  💡 Official invoice will be generated when order is delivered
                </div>
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={cart.length === 0 || billingStatus === 'processing' || isUploadingReceipt}
                className="w-full py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                {billingStatus === 'processing' || isUploadingReceipt ? 'Processing...' : 'Place Order & Send to Caterer'}
              </button>
            </form>
          </div>

          {/* Order Summary Sidebar - Updated */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm sticky top-4">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Order Summary
              </h3>

              {/* Caterer Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">{selectedCaterer.caterer_name}</h4>
                <p className="text-sm text-gray-600">{selectedCaterer.contact_person}</p>
                <p className="text-sm text-gray-600">{selectedCaterer.phone_number}</p>
                <p className="text-sm text-gray-600">{selectedCaterer.address}</p>
              </div>

              {/* Cart Items */}
              <div className="space-y-3 mb-6">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.displayName || item.name}</h4>
                      <p className="text-sm text-gray-600">
                        {item.quantity} {item.unit || 'kg'} × ₹{item.price}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {item.isMix && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Mix</span>}
                        {item.isCustom && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Custom</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.originalEnteredAmount || (item.price * item.quantity))}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(getCartSubtotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery:</span>
                  <span className="font-medium">
                    {getDeliveryFee() === 0 ? 'Free' : formatCurrency(getDeliveryFee())}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-orange-600">{formatCurrency(getCartTotal())}</span>
                </div>
                
                {/* Billing Note */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-800">
                    📋 Invoice will be generated when order is delivered
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingView;

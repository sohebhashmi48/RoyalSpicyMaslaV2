import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  FileText,
  CreditCard
} from 'lucide-react';
import CatererPaymentCollectionDialog from './CatererPaymentCollectionDialog';
import CatererStatusConfirmationDialog from './CatererStatusConfirmationDialog';

function CatererOrderDetailsModal({ order, isOpen, onClose, onRefresh }) {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusConfirmationDialog, setStatusConfirmationDialog] = useState({
    isOpen: false,
    orderDetails: null,
    newStatus: '',
    currentStatus: ''
  });
  const [paymentCollectionDialog, setPaymentCollectionDialog] = useState({
    isOpen: false,
    caterer: null,
    bill: null
  });
  const [shouldOpenPaymentDialog, setShouldOpenPaymentDialog] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch detailed order information
  useEffect(() => {
    if (isOpen && order) {
      fetchOrderDetails();
      setNewStatus(order.status);
    }
  }, [isOpen, order]);

  // Handle opening payment dialog after confirmation dialog closes
  useEffect(() => {
    if (!statusConfirmationDialog.isOpen && shouldOpenPaymentDialog) {
      const orderInfo = orderDetails || order;
      const paymentInfo = getPaymentInfo(orderInfo);
      // Find actual caterer ID from database
      console.log("paymentInfo==",paymentInfo);
      const findCatererAndOpenDialog = async () => {
        let actualCatererId = null;
        try {
          const response = await fetch(`http://localhost:5000/api/caterers/find-by-phone/${encodeURIComponent(orderInfo.caterer_phone)}`);
          const result = await response.json();
          console.log()
          if (result.success && result.data) {
            actualCatererId = result.data.id;
          }
        } catch (error) {
          console.error('Error finding caterer:', error);
        }

        const caterer = {
          id: actualCatererId || orderInfo.id,
          caterer_name: orderInfo.caterer_name,
          phone_number: orderInfo.caterer_phone
        };
        
        const billData = {
          id: orderInfo.id,
          caterer_id: actualCatererId || orderInfo.id,
          caterer_order_id: orderInfo.id,
          pending_amount: paymentInfo.remainingBalance,
          total_amount: orderInfo.total_amount,
          order_number: orderInfo.order_number,
          bill_number: `DELIVERY-${orderInfo.order_number}`, // ✅ Removed timestamp to prevent duplicates
          status: paymentInfo.remainingBalance > 0 ? 'pending' : 'paid'
        };
        
        setPaymentCollectionDialog({
          isOpen: true,
          caterer: caterer,
          bill: billData
        });
        
        setShouldOpenPaymentDialog(false);
      };
      
      findCatererAndOpenDialog();
    }
  }, [statusConfirmationDialog.isOpen, shouldOpenPaymentDialog, orderDetails, order]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/caterer-orders/${order.id}`);
      const result = await response.json();

      if (result.success) {
        setOrderDetails(result.data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Direct status update without confirmation dialog
  const handleStatusUpdate = async () => {
    if (newStatus === order.status) return;
    
    try {
      setUpdating(true);

      const response = await fetch(`http://localhost:5000/api/caterer-orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          confirmed_by: 'Admin'
        }),
      });

      const result = await response.json();

      if (result.success) {
        onRefresh();
        onClose();
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle any status click that needs confirmation
  const handleStatusConfirmationClick = () => {
    setStatusConfirmationDialog({
      isOpen: true,
      orderDetails: orderDetails || order,
      newStatus: newStatus,
      currentStatus: order.status
    });
  };

  // Handle delivered status with payment confirmation
  const handleDeliveredStatusClick = () => {
    if (order.status !== 'delivered') {
      setStatusConfirmationDialog({
        isOpen: true,
        orderDetails: orderDetails || order,
        newStatus: 'delivered',
        currentStatus: order.status
      });
    }
  };

  // ✅ FIXED: Handle when user says they received payment - check for existing bills first
  const handlePaymentReceived = async () => {
    setStatusConfirmationDialog({ isOpen: false, orderDetails: null, newStatus: '', currentStatus: '' });
    
    // Check if bill already exists for this order to prevent duplicates
    try {
      const checkResponse = await fetch(`http://localhost:5000/api/caterer-orders/${order.id}/bills`);
      const checkResult = await checkResponse.json();
      
      if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
        // Use existing bill
        const existingBill = checkResult.data[0];
        
        // Find actual caterer ID
        let actualCatererId = null;
        try {
          const catererResponse = await fetch(`http://localhost:5000/api/caterers/find-by-phone/${encodeURIComponent(order.caterer_phone)}`);
          const catererResult = await catererResponse.json();
          if (catererResult.success && catererResult.data) {
            actualCatererId = catererResult.data.id;
          }
        } catch (error) {
          console.error('Error finding caterer:', error);
        }

        const caterer = {
          id: actualCatererId || order.id,
          caterer_name: order.caterer_name,
          phone_number: order.caterer_phone
        };
        
        setPaymentCollectionDialog({
          isOpen: true,
          caterer: caterer,
          bill: existingBill
        });
      } else {
        // Create new bill only if none exists
        setShouldOpenPaymentDialog(true);
      }
    } catch (error) {
      console.error('Error checking existing bills:', error);
        // Fallback to creating new bill
        setShouldOpenPaymentDialog(true);
    }
  };

  // Handle when user says no payment was received (from status confirmation dialog)
  const handleNoPaymentReceived = async () => {
    try {
      setUpdating(true);
      setStatusConfirmationDialog({ isOpen: false, orderDetails: null, newStatus: '', currentStatus: '' });

      const response = await fetch(`http://localhost:5000/api/caterer-orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'delivered',
          confirmed_by: 'Admin'
        }),
      });

      const result = await response.json();

      if (result.success) {
        onRefresh();
        onClose();
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle non-delivered status confirmation (used for other status updates)
  const handleConfirmPayment = async () => {
    try {
      setUpdating(true);
      setStatusConfirmationDialog({ isOpen: false, orderDetails: null, newStatus: '', currentStatus: '' });

      const response = await fetch(`http://localhost:5000/api/caterer-orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: statusConfirmationDialog.newStatus,
          confirmed_by: 'Admin'
        }),
      });

      const result = await response.json();

      if (result.success) {
        onRefresh();
        onClose();
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle dialog cancellation
  const handleCancelPayment = () => {
    setStatusConfirmationDialog({ isOpen: false, orderDetails: null, newStatus: '', currentStatus: '' });
  };

  // ✅ FIXED: Handle payment submission - properly defined function
  const handlePaymentSubmit = async (formData) => {
    try {
      setUpdating(true);
      
      const response = await fetch('http://localhost:5000/api/caterer-orders/payments', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Payment recorded successfully, now mark order as delivered
        const deliverResponse = await fetch(`http://localhost:5000/api/caterer-orders/${order.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'delivered',
            confirmed_by: 'Admin'
          }),
        });

        const deliverResult = await deliverResponse.json();

        if (deliverResult.success) {
          alert('Payment recorded and order marked as delivered successfully!');
          onRefresh();
          onClose();
        } else {
          alert('Payment recorded but failed to mark order as delivered');
        }
      } else {
        alert('Failed to record payment: ' + result.message);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    } finally {
      setUpdating(false);
      setPaymentCollectionDialog({ isOpen: false, caterer: null, bill: null });
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    const numAmount = Number(amount) || 0;
    return `₹${numAmount.toFixed(2)}`;
  };

  const getPaymentInfo = (orderData) => {
    const orderPaymentAmount = Number(orderData.payment_amount || 0);
    const paymentsSum = Number(orderData.total_paid_amount || 0);
    const totalAmount = Number(orderData.total_amount || 0);

    // Avoid double counting the advance:
    // - If there are recorded payments (paymentsSum > 0), they already include the advance (ADV) entry
    //   so use paymentsSum only.
    // - Otherwise (no payments recorded yet), fall back to the order's advance amount.
    const totalPaid = paymentsSum > 0 ? paymentsSum : orderPaymentAmount;
    const remainingBalance = Math.max(0, totalAmount - totalPaid);

    let paymentStatus = 'Unpaid';
    let statusColor = 'text-red-600';

    if (totalPaid >= totalAmount) {
      paymentStatus = 'Paid';
      statusColor = 'text-green-600';
    } else if (totalPaid > 0) {
      paymentStatus = 'Partial';
      statusColor = 'text-yellow-600';
    }

    return {
      totalPaid,
      remainingBalance,
      paymentStatus,
      statusColor
    };
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  const displayOrder = orderDetails || order;
  const paymentInfo = getPaymentInfo(displayOrder);

  // Add console.log here to always see payment info when modal is open
  console.log('Payment Info:', paymentInfo);
  console.log('Display Order:', displayOrder);

  return (
    <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              #{order.order_number?.slice(-3) || '000'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Caterer Order Details</h2>
              <p className="text-sm text-gray-500">#{order.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto overscroll-contain scroll-smooth max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Loading order details...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Info and Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Information */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Caterer Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Caterer Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Caterer Name</label>
                        <p className="text-gray-900 font-medium">{displayOrder.caterer_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Contact Person</label>
                        <p className="text-gray-900">{displayOrder.contact_person}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-gray-900 flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {displayOrder.caterer_phone}
                        </p>
                      </div>
                      {displayOrder.caterer_email && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Email</label>
                          <p className="text-gray-900 flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {displayOrder.caterer_email}
                          </p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Address</label>
                        <p className="text-gray-900 flex items-start gap-1">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          {displayOrder.caterer_address}
                        </p>
                      </div>
                      {displayOrder.gst_number && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">GST Number</label>
                          <p className="text-gray-900">{displayOrder.gst_number}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order Items
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(displayOrder.items || []).map((item, index) => {
                            let customDetails = null;
                            if (item.custom_details) {
                              try {
                                customDetails = typeof item.custom_details === 'string'
                                  ? JSON.parse(item.custom_details)
                                  : item.custom_details;
                              } catch (e) {
                                console.error('Error parsing custom_details:', e);
                              }
                            }

                            return (
                              <React.Fragment key={index}>
                                <tr>
                                  <td className="px-4 py-3">
                                    <div>
                                      <div className="font-medium text-gray-900">{item.product_name}</div>
                                      {item.source === 'mix-calculator' && (
                                        <div className="text-xs text-blue-600">Mix Item</div>
                                      )}
                                      {Boolean(item.is_custom) && (
                                        <div className="text-xs text-purple-600">Custom Item</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                                    {formatCurrency(item.unit_price)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                    {formatCurrency(item.total_price)}
                                  </td>
                                </tr>

                                {/* Mix Components Details */}
                                {item.source === 'mix-calculator' && (customDetails?.mixItems || customDetails?.mixDetails?.items) && (
                                  <tr>
                                    <td colSpan="4" className="px-4 py-0">
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-2">
                                        <div className="flex items-center justify-between mb-3">
                                          <h6 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                                            <Package className="h-4 w-4" />
                                            Mix Components to Prepare
                                          </h6>
                                          <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                            {(customDetails.mixItems || customDetails.mixDetails?.items || []).length} items
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {(customDetails.mixItems || customDetails.mixDetails?.items || []).map((mixItem, mixIndex) => (
                                            <div key={mixIndex} className="bg-white border border-blue-200 rounded-lg p-3">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <div className="font-medium text-gray-900 text-sm">
                                                    {mixItem.name}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    @ {formatCurrency(mixItem.price || 0)}/kg
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-bold text-blue-600">
                                                    {(mixItem.calculatedQuantity || mixItem.quantity || 0).toFixed(3)} kg
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    = {formatCurrency(mixItem.actualCost || mixItem.allocatedBudget || 0)}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-blue-200">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-blue-700 font-medium">Total Mix Weight:</span>
                                            <span className="text-blue-800 font-bold">
                                              {customDetails.totalWeight || item.quantity} kg
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-blue-700 font-medium">Total Budget:</span>
                                            <span className="text-blue-800 font-bold">
                                              {formatCurrency(customDetails.totalBudget || item.total_price)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Notes */}
                  {displayOrder.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notes
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700">{displayOrder.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Summary and Actions */}
                <div className="space-y-6">
                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Order Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatCurrency(displayOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="font-medium">
                          {displayOrder.delivery_fee === 0 ? 'FREE' : formatCurrency(displayOrder.delivery_fee)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between">
                          <span className="text-lg font-semibold text-gray-900">Total</span>
                          <span className="text-lg font-bold text-blue-600">{formatCurrency(displayOrder.total_amount)}</span>
                        </div>
                      </div>
                      
                      {/* SIMPLIFIED Payment Information */}
                      <div className="border-t border-gray-200 pt-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount Paid</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(paymentInfo.totalPaid)}
                          </span>
                        </div>
                        
                        {paymentInfo.remainingBalance > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Remaining Balance</span>
                            <span className="font-medium text-orange-600">
                              {formatCurrency(paymentInfo.remainingBalance)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Method</span>
                          <span className="font-medium text-blue-600 capitalize">
                            {displayOrder.payment_method || 'Not specified'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Status</span>
                          <span className={`font-medium ${paymentInfo.statusColor}`}>
                            {paymentInfo.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Status */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Current Status</label>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(displayOrder.status)}`}>
                            {displayOrder.status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Update Status</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="ready">Ready</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      {newStatus !== displayOrder.status && newStatus !== 'delivered' && (
                        <button
                          onClick={handleStatusConfirmationClick}
                          disabled={updating}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? 'Updating...' : 'Update Status'}
                        </button>
                      )}
                      
                      {/* Special handling for delivered status */}
                      {newStatus === 'delivered' && displayOrder.status !== 'delivered' && (
                        <button
                          onClick={handleDeliveredStatusClick}
                          disabled={updating}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? 'Processing...' : 'Mark as Delivered'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Dates */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Order Timeline
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created</span>
                        <span className="text-gray-900">
                          {new Date(displayOrder.created_at).toLocaleString()}
                        </span>
                      </div>
                      {displayOrder.confirmed_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confirmed</span>
                          <span className="text-gray-900">
                            {new Date(displayOrder.confirmed_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {displayOrder.delivered_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivered</span>
                          <span className="text-gray-900">
                            {new Date(displayOrder.delivered_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Confirmation Dialog */}
      <CatererStatusConfirmationDialog
        isOpen={statusConfirmationDialog.isOpen}
        onClose={() => setStatusConfirmationDialog({ isOpen: false, orderDetails: null, newStatus: '', currentStatus: '' })}
        onConfirm={handleConfirmPayment}
        onCancel={handleCancelPayment}
        onPaymentReceived={handlePaymentReceived}
        onNoPayment={handleNoPaymentReceived}
        orderDetails={statusConfirmationDialog.orderDetails}
        newStatus={statusConfirmationDialog.newStatus}
        currentStatus={statusConfirmationDialog.currentStatus}
        isLoading={updating}
      />

      {/* Payment Collection Dialog */}
      {paymentCollectionDialog.isOpen && paymentCollectionDialog.caterer && paymentCollectionDialog.bill && (
        <CatererPaymentCollectionDialog
          isOpen={paymentCollectionDialog.isOpen}
          onClose={() => setPaymentCollectionDialog({ isOpen: false, caterer: null, bill: null })}
          onSubmit={handlePaymentSubmit}
          caterer={paymentCollectionDialog.caterer}
          bill={paymentCollectionDialog.bill}
          isLoading={updating}
        />
      )}
    </div>
  );
}

export default CatererOrderDetailsModal;

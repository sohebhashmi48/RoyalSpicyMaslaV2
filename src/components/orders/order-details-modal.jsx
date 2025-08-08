import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator'; // Fixed typo: was 'seprator'
import {
  Printer,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  User,
  MessageSquare,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  IndianRupee
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import PaymentConfirmationDialog from './PaymentConfirmationDialog';
import PaymentCollectionDialog from '../../pages/orders/customerhistory/customers-detailed-page/PaymentCollectionDialog';

const formatCurrency = (amount) => {
  const numAmount = Number(amount) || 0;
  const formatted = numAmount.toFixed(2);
  // Check if the amount already has ₹ symbol to avoid duplication
  if (String(amount).includes('₹')) {
    return String(amount);
  }
  return `₹${formatted}`;
};
const formatDate = (dateStr) => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};
const formatQuantity = (qty) => {
  const numQty = parseFloat(qty);
  return isNaN(numQty) ? '0.000' : numQty.toFixed(3);
};

const calculateActualProfit = (items) => {
  let totalProfit = 0;

  // Cost lookup for consistent profit calculation
  const costLookup = {
    'almonds': 900,
    'cashews': 500,
    'mirchi': 250
  };

  items.forEach(item => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const costPrice = parseFloat(item.average_cost_price) || 0;

    // Handle mix items specially
    if (item.source === 'mix-calculator' && item.custom_details?.mixItems) {
      // Calculate profit based on mix components
      let mixProfit = 0;
      item.custom_details.mixItems.forEach(mixItem => {
        const mixQuantity = parseFloat(mixItem.calculatedQuantity || mixItem.quantity || 0);
        const mixRetailPrice = parseFloat(mixItem.price || 0);
        const mixCostPrice = costLookup[mixItem.name.toLowerCase()] || 0;

        if (mixCostPrice > 0) {
          const mixItemProfit = (mixRetailPrice - mixCostPrice) * mixQuantity;
          if (mixItemProfit > 0) {
            mixProfit += mixItemProfit;
          }
        }
      });
      totalProfit += mixProfit;
    } else {
      // Regular item profit calculation
      if (costPrice > 0) {
        const profitPerUnit = unitPrice - costPrice;
        const itemProfit = profitPerUnit * quantity;

        // Only add positive profits (ignore items where cost > retail)
        if (itemProfit > 0) {
          totalProfit += itemProfit;
        }
      }
    }
  });

  return totalProfit;
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    out_for_delivery: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export default function OrderDetailsModal({ order, isOpen, onClose, onRefresh }) {
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Payment dialog states
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState({
    isOpen: false,
    orderData: null
  });
  const [paymentCollectionDialog, setPaymentCollectionDialog] = useState({
    isOpen: false,
    customer: null,
    bills: [],
    selectedBill: null
  });
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Reset state when modal opens/closes or order changes
  useEffect(() => {
    if (isOpen && order) {
      setOrderDetails(order);
      setNewStatus(order.status || '');
      setIsLoading(false);
      setFetchingDetails(false);
    } else if (!isOpen) {
      // Reset state when modal closes
      setOrderDetails(null);
      setNewStatus('');
      setIsLoading(false);
      setFetchingDetails(false);
    }
  }, [isOpen, order?.id]);

  // Fetch full order details only once when modal opens
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!order?.id || !isOpen || fetchingDetails) return;

      try {
        setFetchingDetails(true);
        const response = await fetch(`http://localhost:5000/api/orders/${order.id}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setOrderDetails(result.data);
          setNewStatus(result.data.status);
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        // Keep the basic order data if fetch fails
      } finally {
        setFetchingDetails(false);
      }
    };

    // Only fetch if we have basic order data but no items
    if (isOpen && order && (!orderDetails?.items || orderDetails.items.length === 0)) {
      fetchOrderDetails();
    }
  }, [isOpen, order?.id, orderDetails?.items]);

  // Handle dialog close properly
  const handleClose = (open) => {
    if (!open) {
      setIsLoading(false);
      setNewStatus('');
      onClose();
    }
  };

  const handleStatusUpdate = async () => {
    if (newStatus === displayOrder.status) return;

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${displayOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          changed_by: 'Admin User',
          notes: `Status changed to ${newStatus} from order details`
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update local order details
        setOrderDetails(prev => prev ? { ...prev, status: newStatus } : prev);

        toast({
          title: 'Status Updated',
          description: `Order status changed to ${newStatus.replace('_', ' ')}`,
          type: 'success'
        });

        // If status changed to delivered, show payment confirmation dialog
        if (newStatus === 'delivered') {
          setPaymentConfirmDialog({
            isOpen: true,
            orderData: { ...displayOrder, status: newStatus }
          });
        }

        // Call parent refresh callback
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    // Print functionality removed - will be updated later
  };

  // Payment dialog handlers
  const handlePaymentConfirmYes = async () => {
    try {
      // Close payment confirmation dialog
      setPaymentConfirmDialog({ isOpen: false, orderData: null });

      // Get customer phone from order data
      const customerPhone = paymentConfirmDialog.orderData?.customer_phone;
      if (!customerPhone) {
        toast({
          title: 'Error',
          description: 'Customer phone number not found',
          type: 'error'
        });
        return;
      }

      // Find customer by phone number
      const customersResponse = await fetch('http://localhost:5000/api/customers');
      const customersResult = await customersResponse.json();

      if (!customersResult.success) {
        throw new Error('Failed to fetch customers');
      }

      // Find customer by phone number
      const customer = customersResult.data.find(c => c.phone === customerPhone);
      if (!customer) {
        toast({
          title: 'Error',
          description: 'Customer not found in database',
          type: 'error'
        });
        return;
      }

      // Fetch customer details and bills
      const customerResponse = await fetch(`http://localhost:5000/api/customers/${customer.id}`);
      const customerResult = await customerResponse.json();

      if (!customerResult.success) {
        throw new Error('Failed to fetch customer details');
      }

      // Find the bill for this order
      const orderBill = customerResult.data.bills.find(bill =>
        bill.order_id === paymentConfirmDialog.orderData.id
      );

      // Open payment collection dialog
      setPaymentCollectionDialog({
        isOpen: true,
        customer: customerResult.data.customer,
        bills: customerResult.data.bills,
        selectedBill: orderBill || null
      });

    } catch (error) {
      console.error('Error preparing payment collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to open payment collection dialog',
        type: 'error'
      });
    }
  };

  const handlePaymentConfirmNo = () => {
    // Close payment confirmation dialog
    setPaymentConfirmDialog({ isOpen: false, orderData: null });

    // Show success message that amount will go to outstanding
    toast({
      title: 'Payment Status Updated',
      description: 'Order amount has been added to customer\'s outstanding balance',
      type: 'success'
    });
  };

  const handlePaymentSubmit = async (formData) => {
    try {
      setIsPaymentLoading(true);

      const response = await fetch('http://localhost:5000/api/customers/payments', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to record payment');
      }

      toast({
        title: 'Payment Recorded',
        description: 'Payment has been successfully recorded',
        type: 'success'
      });

      // Close payment collection dialog
      setPaymentCollectionDialog({
        isOpen: false,
        customer: null,
        bills: [],
        selectedBill: null
      });

    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        type: 'error'
      });
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const closePaymentCollectionDialog = () => {
    setPaymentCollectionDialog({
      isOpen: false,
      customer: null,
      bills: [],
      selectedBill: null
    });
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      confirmed: <CheckCircle className="h-4 w-4" />,
      processing: <Package className="h-4 w-4" />,
      out_for_delivery: <Truck className="h-4 w-4" />,
      delivered: <CheckCircle className="h-4 w-4" />,
      cancelled: <XCircle className="h-4 w-4" />,
    };
    return icons[status] || <Clock className="h-4 w-4" />;
  };

  // Don't render if no order data
  if (!order) return null;

  // Use orderDetails if available, fallback to order
  const displayOrder = orderDetails || order;

  // Show loading state while fetching details
  if (fetchingDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading order details...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90vw] max-h-[95vh] p-0 overflow-hidden">
        {/* Fixed Header */}
        <div className="p-8 pb-4 border-b border-gray-100">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-2xl font-bold">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  #{order.order_number?.slice(-3) || '000'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
                  <p className="text-sm text-gray-500 font-normal">#{order.order_number}</p>
                </div>
              </div>
              <Badge className={`${getStatusColor(displayOrder.status)} flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full shadow-sm`}>
                {getStatusIcon(displayOrder.status)}
                {displayOrder.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-4">
          <div className="space-y-8">
          {/* Header Actions */}
          <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Current Status:</span>
              </div>
              <Badge className={`${getStatusColor(displayOrder.status)} flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full shadow-sm`}>
                {getStatusIcon(displayOrder.status)}
                {displayOrder.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="flex gap-3">
              <Button onClick={handlePrint} variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </div>

          {/* Order Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{displayOrder.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{displayOrder.customer_phone}</span>
                </div>
                {displayOrder.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{displayOrder.customer_email}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                  <span className="text-sm">{displayOrder.delivery_address}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <span className="text-sm text-gray-500">Order Date:</span>
                  <p className="font-medium">{formatDate(displayOrder.created_at)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Source:</span>
                  <p className="font-medium capitalize">{displayOrder.order_source}</p>
                </div>
                {displayOrder.approved_at && (
                  <div>
                    <span className="text-sm text-gray-500">Approved:</span>
                    <p className="font-medium">{formatDate(displayOrder.approved_at)}</p>
                    {displayOrder.approved_by_name && (
                      <p className="text-sm text-gray-500">by {displayOrder.approved_by_name}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <IndianRupee className="h-4 w-4 text-white" />
                  </div>
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Subtotal:</span>
                  <p className="font-medium">{formatCurrency(displayOrder.subtotal)}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Delivery Fee:</span>
                  <p className="font-medium">{formatCurrency(displayOrder.delivery_fee || 0)}</p>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Amount:</span>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(displayOrder.total_amount)}</p>
                </div>
                {displayOrder.status === 'delivered' && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Actual Profit:</span>
                      <p className="font-bold text-blue-600">{formatCurrency(calculateActualProfit(displayOrder.items || []))}</p>
                    </div>
                    <p className="text-xs text-gray-400 text-center">*Based on actual cost vs retail price</p>
                  </>
                )}
                <div className="pt-2">
                  <span className="text-sm text-gray-500">Payment Status:</span>
                  <Badge className={`ml-2 ${displayOrder.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {displayOrder.payment_status || 'pending'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Update */}
          <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 p-6">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                Update Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-56 h-12 border-2 border-gray-200 rounded-xl shadow-sm hover:border-purple-300 transition-colors">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-0">
                    <SelectItem value="pending" className="rounded-lg">Pending</SelectItem>
                    <SelectItem value="confirmed" className="rounded-lg">Confirmed</SelectItem>
                    <SelectItem value="processing" className="rounded-lg">Processing</SelectItem>
                    <SelectItem value="out_for_delivery" className="rounded-lg">Out for Delivery</SelectItem>
                    <SelectItem value="delivered" className="rounded-lg">Delivered</SelectItem>
                    <SelectItem value="cancelled" className="rounded-lg">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleStatusUpdate}
                  disabled={newStatus === displayOrder.status || isLoading}
                  className="h-12 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </div>
                  ) : (
                    'Update Status'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 p-6">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Package className="h-4 w-4 text-white" />
                </div>
                Order Items ({displayOrder.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {displayOrder.items && displayOrder.items.length > 0 ? (
                  displayOrder.items.map((item) => {
                  // Parse custom_details if it's a string
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
                    <div key={item.id} className="border border-orange-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      {/* Main Item */}
                      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-orange-50">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden">
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.querySelector('.fallback-icon').style.display = 'block';
                                }}
                              />
                            ) : null}
                            <Package className="h-6 w-6 text-white fallback-icon" style={{ display: item.product_image ? 'none' : 'block' }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                              {item.source === 'mix-calculator' && item.mix_number && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                  Mix #{item.mix_number}
                                </Badge>
                              )}
                              {item.source === 'custom' && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatQuantity(item.quantity)} {item.unit} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600 text-lg">{formatCurrency(item.total_price)}</p>
                          {item.average_cost_price && parseFloat(item.average_cost_price) > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              <div>Cost: {formatCurrency(parseFloat(item.average_cost_price) * parseFloat(item.quantity))}</div>
                              <div className="text-green-600 font-medium">
                                Profit: {formatCurrency((parseFloat(item.unit_price) - parseFloat(item.average_cost_price)) * parseFloat(item.quantity))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mix Items Details - Packing Information */}
                      {item.source === 'mix-calculator' && (
                        customDetails?.mixItems ? (
                        <div className="bg-orange-50 border-t border-orange-200">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Items to Pack for Mix #{customDetails.mixNumber || item.mix_number}
                              </h5>
                              <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                {customDetails.mixItems.length} components
                              </div>
                            </div>

                            <div className="space-y-2">
                              {customDetails.mixItems.map((mixItem, index) => {
                                // Get product image URL if available
                                let productImage = null;
                                if (mixItem.product_images && mixItem.product_images.length > 0) {
                                  const imageUrl = mixItem.product_images[0];
                                  if (imageUrl.startsWith('http')) {
                                    productImage = imageUrl;
                                  } else if (imageUrl.startsWith('/api/')) {
                                    productImage = `http://localhost:5000${imageUrl}`;
                                  } else {
                                    productImage = `http://localhost:5000/api/products/images/${imageUrl}`;
                                  }
                                }

                                return (
                                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center overflow-hidden">
                                        {productImage ? (
                                          <img
                                            src={productImage}
                                            alt={mixItem.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                              e.target.nextElementSibling.style.display = 'flex';
                                            }}
                                          />
                                        ) : null}
                                        <div className="w-full h-full flex items-center justify-center" style={{ display: productImage ? 'none' : 'flex' }}>
                                          <span className="text-sm font-medium text-orange-700">
                                            {mixItem.name?.charAt(0) || 'M'}
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <h6 className="font-semibold text-gray-900">{mixItem.name}</h6>
                                        <p className="text-sm text-gray-600">
                                          Category: {mixItem.category_name || 'Unknown'}
                                          {mixItem.sub_category && ` • ${mixItem.sub_category}`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-orange-600">
                                        {formatQuantity(mixItem.calculatedQuantity || mixItem.quantity || 0)} {mixItem.unit || 'kg'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        @ {formatCurrency(mixItem.price || 0)}/kg
                                      </div>
                                      <div className="text-sm font-medium text-gray-700">
                                        Total: {formatCurrency(mixItem.actualCost || mixItem.price || 0)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-4 pt-3 border-t border-orange-200 bg-orange-100 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-orange-800">Mix Total:</span>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-orange-800">
                                    {formatQuantity(customDetails.totalWeight || item.quantity)} kg
                                  </div>
                                  <div className="text-sm text-orange-600">
                                    Budget: {formatCurrency(customDetails.totalBudget || item.price)}
                                  </div>
                                  {/* Calculate mix profit based on components */}
                                  {(() => {
                                    // Define cost lookup for mix components
                                    const costLookup = {
                                      'almonds': 900,
                                      'cashews': 500,
                                      'mirchi': 250
                                    };

                                    const totalMixCost = customDetails.mixItems.reduce((total, mixItem) => {
                                      const quantity = parseFloat(mixItem.calculatedQuantity || mixItem.quantity || 0);
                                      const costPrice = costLookup[mixItem.name.toLowerCase()] || 0;
                                      return total + (costPrice * quantity);
                                    }, 0);

                                    const mixSellingPrice = parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0);
                                    const mixProfit = mixSellingPrice - totalMixCost;

                                    return (
                                      <div className="text-sm text-blue-600 font-medium">
                                        Mix Profit: {formatCurrency(mixProfit > 0 ? mixProfit : 0)}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        ) : (
                          <div className="bg-yellow-50 border-t border-yellow-200 p-4">
                            <div className="flex items-center gap-2 text-yellow-800">
                              <Package className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Mix #{item.mix_number || 'Unknown'} - Mix details not available
                              </span>
                            </div>
                            <p className="text-xs text-yellow-600 mt-1">
                              Mix total: {formatQuantity(item.quantity)} {item.unit} for {formatCurrency(item.total_price)}
                            </p>
                            <p className="text-xs text-yellow-600">
                              Check the original order or contact customer for specific mix components.
                            </p>
                            {customDetails && (
                              <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                                <strong>Debug info:</strong> {JSON.stringify(customDetails)}
                              </div>
                            )}
                          </div>
                        )
                      )}


                    </div>
                  );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                    <p className="text-gray-500">This order doesn't have any items yet.</p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(displayOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>{formatCurrency(displayOrder.delivery_fee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(displayOrder.total_amount)}</span>
                </div>
                {displayOrder.status === 'delivered' && (
                  <>
                    <Separator />
                    <div className="flex justify-between font-medium text-green-600">
                      <span>Actual Profit:</span>
                      <span>{formatCurrency(calculateActualProfit(displayOrder.items || []))}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {displayOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{displayOrder.notes}</p>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </DialogContent>

      {/* Payment Confirmation Dialog */}
      <PaymentConfirmationDialog
        isOpen={paymentConfirmDialog.isOpen}
        onClose={() => setPaymentConfirmDialog({ isOpen: false, orderData: null })}
        onYes={handlePaymentConfirmYes}
        onNo={handlePaymentConfirmNo}
        orderDetails={paymentConfirmDialog.orderData}
        isLoading={isPaymentLoading}
      />

      {/* Payment Collection Dialog */}
      <PaymentCollectionDialog
        isOpen={paymentCollectionDialog.isOpen}
        onClose={closePaymentCollectionDialog}
        onPaymentSubmit={handlePaymentSubmit}
        customer={paymentCollectionDialog.customer}
        bills={paymentCollectionDialog.bills}
        selectedBill={paymentCollectionDialog.selectedBill}
        isLoading={isPaymentLoading}
      />
    </Dialog>
  );
}

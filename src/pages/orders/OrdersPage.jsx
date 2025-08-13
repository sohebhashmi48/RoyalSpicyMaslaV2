import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';


import {
  Package, Clock, CheckCircle, XCircle, Truck, Eye,
  Phone, MapPin, Calendar, Search, RefreshCw, ArrowLeft, IndianRupee, Users,
} from 'lucide-react';

import OrderDetailsModal from '../../components/orders/order-details-modal';
import BatchAllocationDialog from '../../components/orders/BatchAllocationDialog';
import OrderConfirmationDialog from '../../components/orders/order-confirmation-dialog';
import PaymentConfirmationDialog from '../../components/orders/PaymentConfirmationDialog';
import PaymentCollectionDialog from './customerhistory/customers-detailed-page/PaymentCollectionDialog';
import { useToast } from '../../contexts/ToastContext';


// Utility functions
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

// Date utility functions
const getDateRange = (selectedDate) => {
  return {
    start: selectedDate,
    end: selectedDate
  };
};

// Constants
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-4 w-4" />,
    actionButton: { text: 'Approve', action: 'approve', color: 'bg-green-600 hover:bg-green-700' }
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-700',
    icon: <CheckCircle className="h-4 w-4" />,
    actionButton: { text: 'Process', action: 'process', color: 'bg-purple-600 hover:bg-purple-700' }
  },
  processing: {
    label: 'Processing',
    color: 'bg-purple-100 text-purple-700',
    icon: <Package className="h-4 w-4" />,
    actionButton: { text: 'Ship', action: 'ship', color: 'bg-orange-600 hover:bg-orange-700' }
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    color: 'bg-orange-100 text-orange-700',
    icon: <Truck className="h-4 w-4" />,
    actionButton: { text: 'Deliver', action: 'deliver', color: 'bg-green-600 hover:bg-green-700' }
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-4 w-4" />
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-4 w-4" />
  }
};

const SOURCE_CONFIG = {
  online: { label: 'Online', color: 'bg-green-100 text-green-700' },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
  phone: { label: 'Phone', color: 'bg-purple-100 text-purple-700' },
  walk_in: { label: 'Walk-in', color: 'bg-orange-100 text-orange-700' },
  all: { label: 'All Sources', color: 'bg-gray-100 text-gray-700' }
};

function OrderCard({ order, onViewOrder, onOrderAction }) {
  const statusConfig = STATUS_CONFIG[order.status];
  const sourceConfig = SOURCE_CONFIG[order.order_source];

  return (
    <div className="shadow-lg rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-2">
          <h3 className="text-lg font-semibold truncate">#{order.order_number}</h3>
          <Badge className={`flex items-center gap-1 ${statusConfig.color}`}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </Badge>
          <Badge variant="outline" className={sourceConfig.color}>
            {sourceConfig.label}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 text-sm text-gray-600 gap-2">
          <div className="flex items-center gap-2 truncate">
            <Phone className="h-4 w-4" />
            <span>{order.customer_name} - {order.customer_phone}</span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4" />
            <span>{order.delivery_address}</span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(order.created_at)}</span>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-2 items-center">
          <span className="font-medium">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
          <span className="mx-2">&bull;</span>
          <span className="font-medium">Revenue: {formatCurrency(order.total_amount)}</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-end">
        {statusConfig.actionButton && (
          <Button 
            size="sm" 
            className={`${statusConfig.actionButton.color} text-white`} 
            onClick={() => onOrderAction(order, statusConfig.actionButton.action)}
          >
            {statusConfig.icon}
            <span className="ml-1">{statusConfig.actionButton.text}</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onViewOrder(order)}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
}


// Orders List Component
function OrdersList({ orders, onViewOrder, onOrderAction }) {
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-500">No orders match your current filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
        <CardDescription>{orders.length} order{orders.length !== 1 ? 's' : ''} found</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onViewOrder={onViewOrder}
            onOrderAction={onOrderAction}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// Main Component
export default function OrdersPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [filters, setFilters] = useState({ status: 'all', source: 'all', search: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const [confirmationDialog, setConfirmationDialog] = useState({ isOpen: false, order: null, action: 'approve' });
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState({});
  const [allocationDialog, setAllocationDialog] = useState({ isOpen: false, order: null });

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

  // Real data state
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
    total_revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref to store current values for auto-refresh
  const currentValuesRef = useRef({ selectedDate });
  const lastFetchTimeRef = useRef(0);

  // Update ref when values change
  useEffect(() => {
    currentValuesRef.current = { selectedDate };
  }, [selectedDate]);

  // Individual fetch functions
  const fetchOrdersOnly = useCallback(async (customDate = selectedDate) => {
    if (ordersLoading) return;

    try {
      setOrdersLoading(true);

      // Get date range for filtering
      const { start, end } = getDateRange(customDate);

      // Build query parameters
      const params = new URLSearchParams({
        date_from: start,
        date_to: end
      });

      const response = await fetch(`http://localhost:5000/api/orders?${params}`);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [selectedDate, ordersLoading]);

  const fetchOrderStatsOnly = useCallback(async (customDate = selectedDate) => {
    if (statsLoading) return;

    try {
      setStatsLoading(true);

      // Get date range for filtering
      const { start, end } = getDateRange(customDate);

      // Build query parameters
      const params = new URLSearchParams({
        date_from: start,
        date_to: end
      });

      const response = await fetch(`http://localhost:5000/api/orders/stats?${params}`);
      const result = await response.json();

      if (result.success) {
        setOrderStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedDate, statsLoading]);

  // Combined fetch function with debouncing
  const fetchOrders = useCallback(async (customDate = selectedDate, force = false) => {
    // Debounce: prevent calls within 200ms unless forced
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 200) {
      return;
    }

    // Prevent multiple simultaneous calls
    if (ordersLoading || statsLoading) return;

    lastFetchTimeRef.current = now;

    try {
      // Only show main loading for initial load or forced refresh
      if (force || orders.length === 0) {
        setLoading(true);
      }

      // Fetch both in parallel
      await Promise.all([
        fetchOrdersOnly(customDate),
        fetchOrderStatsOnly(customDate)
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (force || orders.length === 0) {
        setLoading(false);
      }
    }
  }, [selectedDate, ordersLoading, statsLoading, fetchOrdersOnly, fetchOrderStatsOnly]);

  const fetchOrderStats = fetchOrderStatsOnly;

  // Load data on component mount
  useEffect(() => {
    fetchOrders(selectedDate, true); // Force initial load
  }, []);

  // Automatic daily reset at 12 AM
  useEffect(() => {
    const checkForDailyReset = () => {
      const now = new Date();
      const lastReset = localStorage.getItem('lastOrdersReset');
      const today = now.toDateString();

      // If it's a new day or first time, reset to today
      if (!lastReset || lastReset !== today) {
        setSelectedDate(now.toISOString().split('T')[0]);
        localStorage.setItem('lastOrdersReset', today);
        fetchOrders(now.toISOString().split('T')[0], true);
      }
    };

    // Check immediately
    checkForDailyReset();

    // Set up interval to check every minute for date change
    const interval = setInterval(checkForDailyReset, 60000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh orders every 60 seconds for real-time updates (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      const { selectedDate: currentDate } = currentValuesRef.current;
      fetchOrders(currentDate, false); // Don't force, let debouncing work
    }, 60000); // Increased to 60 seconds

    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent recreating interval

  // Refresh orders when selected date changes
  useEffect(() => {
    fetchOrders(selectedDate, true);
  }, [selectedDate]);

  // Refresh orders when confirmation dialog closes (for instant updates)
  useEffect(() => {
    if (!confirmationDialog.isOpen && confirmationDialog.order) {
      // Dialog was just closed after an action, refresh data
      const timeoutId = setTimeout(() => {
        fetchOrders(selectedDate, true); // Force refresh after action
      }, 100); // Small delay to ensure backend has processed the update

      return () => clearTimeout(timeoutId);
    }
  }, [confirmationDialog.isOpen, selectedDate]);

  // Delivery payment dialog functionality temporarily removed

  // Use real stats or fallback to calculated stats
  const stats = useMemo(() => {
    if (orderStats.total > 0) {
      return {
        ...orderStats,
        // Profit will be calculated from actual inventory costs
        totalProfit: orderStats.totalProfit || 0
      };
    }

    // Fallback calculation from orders - profit from actual order data
    const result = { total: orders.length, pending: 0, processing: 0, out_for_delivery: 0, delivered: 0, totalProfit: 0 };
    orders.forEach(order => {
      result[order.status] = (result[order.status] || 0) + 1;
      // Use actual profit from order data (calculated from inventory costs)
      if (order.status === 'delivered' && order.profit) {
        result.totalProfit += parseFloat(order.profit) || 0;
      }
    });
    return result;
  }, [orders, orderStats]);

  // Filter orders (orders are already filtered by date from backend)
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    let filteredList = [...orders];

    // Status filtering is handled by filters.status below

    // Apply additional filters
    if (filters.status !== 'all') {
      filteredList = filteredList.filter(order => order.status === filters.status);
    }
    if (filters.source !== 'all') {
      filteredList = filteredList.filter(order => order.order_source === filters.source);
    }

    // Apply search
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      filteredList = filteredList.filter(order =>
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_phone.includes(query)
      );
    }

    return filteredList;
  }, [orders, filters]);

  // Event handlers
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleOrderAction = (order, action) => {
    console.log('🔥 [FRONTEND] Order action triggered:', {
      orderId: order.id,
      orderNumber: order.order_number,
      action: action,
      timestamp: new Date().toISOString()
    });
    // Intercept process to force allocation dialog
    if (action === 'process') {
      setAllocationDialog({ isOpen: true, order });
      return;
    }
    setConfirmationDialog({ isOpen: true, order, action });
  };

  const handleConfirmAction = async () => {
    if (!confirmationDialog.order) return;

    const orderId = confirmationDialog.order.id;
    
    // Prevent multiple rapid calls to the same action
    if (actionInProgress[orderId]) {
      console.log('🔥 [FRONTEND] Action already in progress for order:', orderId);
      return;
    }

    console.log('🔥 [FRONTEND] Confirm action triggered:', {
      orderId: orderId,
      orderNumber: confirmationDialog.order.order_number,
      action: confirmationDialog.action,
      timestamp: new Date().toISOString()
    });

    setActionInProgress(prev => ({ ...prev, [orderId]: true }));
    setIsConfirmationLoading(true);

    try {
      const { order, action } = confirmationDialog;
      let newStatus = '';

      // Map actions to status
      switch (action) {
        case 'approve':
        case 'confirm':
          newStatus = 'confirmed';
          break;
        case 'process':
          newStatus = 'processing';
          break;
        case 'ship':
          newStatus = 'out_for_delivery';
          break;
        case 'deliver':
          newStatus = 'delivered';
          break;
        case 'cancel':
          newStatus = 'cancelled';
          break;
        default:
          newStatus = action;
      }

      // If delivering, first deduct inventory based on saved allocations
      if (newStatus === 'delivered') {
        const deductRes = await fetch(`http://localhost:5000/api/orders/${order.id}/deliver-with-deduction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markDelivered: false })
        });
        const deductData = await deductRes.json();
        if (!deductData.success) {
          throw new Error(deductData.message || 'Failed to deduct inventory. Ensure batches are allocated.');
        }
      }

      console.log('🔥 [FRONTEND] Making API call to update order status:', { orderId: order.id, newStatus, action });

      const response = await fetch(`http://localhost:5000/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          changed_by: 'Admin User', // You can get this from auth context
          notes: `Status changed to ${newStatus}`
        })
      });

      const result = await response.json();

      console.log('🔥 [FRONTEND] Order status update response:', result);

      if (result.success) {
        showSuccess(`Order ${action}d successfully - ${order.order_number}`);

        // Close confirmation dialog first
        setConfirmationDialog({ isOpen: false, order: null, action: 'approve' });

        // If status changed to delivered, payment is now automatic - skip payment dialog
        if (newStatus === 'delivered') {
          console.log('🔥 [FRONTEND] Status changed to delivered, payment recorded automatically');
          showSuccess(`Payment of ₹${formatCurrency(order.total_amount)} recorded automatically for order ${order.order_number}`);
        }

        // Refresh orders and close details modal
        console.log('🔥 [FRONTEND] Refreshing orders after status update');
        await Promise.all([
          fetchOrders(selectedDate),
          fetchOrderStats(selectedDate)
        ]);
        setIsDetailsModalOpen(false);
      } else {
        throw new Error(result.message || 'Failed to update order');
      }
    } catch (error) {
      console.error('🔥 [FRONTEND] Error updating order:', error);
      showError('Failed to update order status. Please try again.');
      // Only close confirmation dialog on error, keep details modal open
      setConfirmationDialog({ isOpen: false, order: null, action: 'approve' });
    } finally {
      setIsConfirmationLoading(false);
      setActionInProgress(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Payment dialog handlers
  const handlePaymentConfirmYes = async () => {
    try {
      // Close payment confirmation dialog
      setPaymentConfirmDialog({ isOpen: false, orderData: null });

      // Get customer phone from order data
      const customerPhone = paymentConfirmDialog.orderData?.customer_phone;
      if (!customerPhone) {
        showError('Customer phone number not found');
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
        showError('Customer not found in database');
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
      showError('Failed to open payment collection dialog');
    }
  };

  const handlePaymentConfirmNo = () => {
    // Close payment confirmation dialog
    setPaymentConfirmDialog({ isOpen: false, orderData: null });

    // Show success message that amount will go to outstanding
    showSuccess('Order amount has been added to customer\'s outstanding balance');
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

      showSuccess('Payment has been successfully recorded');

      // Close payment collection dialog
      setPaymentCollectionDialog({
        isOpen: false,
        customer: null,
        bills: [],
        selectedBill: null
      });

    } catch (error) {
      console.error('Error recording payment:', error);
      showError(error.message || 'Failed to record payment');
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

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order Management</h1>
            <p className="text-gray-600">Manage customer orders and track deliveries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/orders/customer-history')}
          >
            <Users className="h-4 w-4 mr-2" />
            Customer History
          </Button>
          <Button variant="outline" onClick={() => {
            fetchOrders(selectedDate, true); // Force refresh
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading orders...</span>
        </div>
      ) : (
        <>
          {/* Date Range Info */}
          <div className="mb-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium mt-3 text-blue-800">
                      Showing data for: {formatDate(selectedDate)}
                    </span>
                  </div>
                  <div className="text-sm text-blue-600">
                    {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Package, color: 'text-blue-600' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
          { label: 'Processing', value: stats.processing, icon: Package, color: 'text-purple-600' },
          { label: 'Out for Delivery', value: stats.out_for_delivery, icon: Truck, color: 'text-orange-600' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Profit', value: formatCurrency(stats.totalProfit), icon: IndianRupee, color: 'text-blue-600' },
        ].map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 mt-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>



      {/* Search and Filter Section */}
      <div className="mt-4">
        <Card className="mb-4">
          <CardContent className="p-4 flex mt-5 flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search orders..."
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            <Select value={filters.status} onValueChange={value => updateFilter('status', value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.source} onValueChange={value => updateFilter('source', value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Source" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                }}
                className="w-40"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
          
          <OrdersList
            orders={filteredOrders}
            onViewOrder={handleViewOrder}
            onOrderAction={handleOrderAction}
          />
      </div>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setSelectedOrder(null);
            setIsDetailsModalOpen(false);
          }}
          onRefresh={() => {
            fetchOrders(selectedDate); // Actually refresh the orders data
            fetchOrderStats(selectedDate); // Refresh the stats as well
            showSuccess('Order updated successfully');
          }}
        />
      )}

      {confirmationDialog.order && (
        <OrderConfirmationDialog
          isOpen={confirmationDialog.isOpen}
          onClose={() => setConfirmationDialog({ isOpen: false, order: null, action: 'approve' })}
          onConfirm={handleConfirmAction}
          order={confirmationDialog.order}
          action={confirmationDialog.action}
          isLoading={isConfirmationLoading}
        />
      )}

      {/* Batch Allocation Dialog */}
      {allocationDialog.order && (
        <BatchAllocationDialog
          isOpen={allocationDialog.isOpen}
          order={allocationDialog.order}
          onClose={async (saved) => {
            setAllocationDialog({ isOpen: false, order: null });
            if (saved) {
              // After saving allocations, set status to processing
              try {
                const response = await fetch(`http://localhost:5000/api/orders/${allocationDialog.order.id}/status`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'processing', changed_by: 'Admin', notes: 'Processing after batch allocation' })
                });
                const result = await response.json();
                if (result.success) {
                  showSuccess('Order moved to Processing');
                  await Promise.all([
                    fetchOrders(selectedDate),
                    fetchOrderStats(selectedDate)
                  ]);
                } else {
                  showError(result.message || 'Failed to update status');
                }
              } catch (e) {
                console.error(e);
                showError('Failed to update status to Processing');
              }
            }
          }}
        />
      )}

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
        </>
      )}
    </div>
  );
}

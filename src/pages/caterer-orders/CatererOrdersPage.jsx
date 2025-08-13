import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useCatererOrders from './useCatererOrders';
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building,
  FileText,
  Calendar,
  History
} from 'lucide-react';
import CatererOrderDetailsModal from '../../components/caterer-orders/caterer-order-details-modal';
import CatererOrderCard from '../../components/caterer-orders/CatererOrderCard';
import OrderConfirmationDialog from '../../components/orders/order-confirmation-dialog';
import CatererStatusConfirmationDialog from '../../components/caterer-orders/CatererStatusConfirmationDialog';
import CatererPaymentCollectionDialog from '../../components/caterer-orders/CatererPaymentCollectionDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

function CatererOrdersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('total');
  
  const {
    catererOrders,
    loading,
    error,
    stats,
    fetchCatererOrders,
    fetchStats,
    formatCurrency
  } = useCatererOrders(selectedDate, activeTab, searchQuery);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Confirmation dialog state (matching customer orders format)
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    order: null,
    action: 'approve'
  });
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false);

  // Status confirmation dialog state
  const [statusConfirmationDialog, setStatusConfirmationDialog] = useState({
    isOpen: false,
    order: null,
    newStatus: '',
    currentStatus: ''
  });
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Payment collection dialog state
  const [paymentCollectionDialog, setPaymentCollectionDialog] = useState({
    isOpen: false,
    caterer: null,
    bill: null
  });

  // Store order ID for payment processing
  const [processingOrderId, setProcessingOrderId] = useState(null);

  // Handler functions
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleModalClose = () => {
    setIsOrderModalOpen(false);
    setSelectedOrder(null);
  };

  const handleRefresh = () => {
    fetchCatererOrders();
    fetchStats();
  };

  const handleConfirmStatusUpdate = async () => {
    if (!confirmationDialog.order) return;

    setIsConfirmationLoading(true);
    try {
      // Map customer order actions back to caterer statuses
      const statusMap = {
        'approve': 'confirmed',
        'process': 'processing',
        'ship': 'ready',
        'deliver': 'delivered',
        'cancel': 'cancelled'
      };

      const newStatus = statusMap[confirmationDialog.action] || confirmationDialog.action;

      const response = await fetch(`http://localhost:5000/api/caterer-orders/${confirmationDialog.order.id}/status`, {
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
        // Refresh both orders list and stats to update profit instantly
        await Promise.all([
          fetchCatererOrders(),
          fetchStats()
        ]);
        // Close the confirmation dialog
        setConfirmationDialog({ isOpen: false, order: null, action: 'approve' });
      } else {
        console.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setIsConfirmationLoading(false);
    }
  };

  const handleCancelStatusUpdate = () => {
    setConfirmationDialog({ isOpen: false, order: null, action: 'approve' });
  };

  const handleDeliveredStatusClick = (order) => {
    setStatusConfirmationDialog({
      isOpen: true,
      order: order,
      newStatus: 'delivered',
      currentStatus: order.status
    });
  };

  // FIXED: Helper function to calculate payment info similar to CatererOrderDetailsModal
  const getPaymentInfo = (orderData) => {
    const advancePayment = Number(orderData.payment_amount || orderData.advance_payment_amount || 0);
    const paymentsSum = Number(orderData.total_paid_amount || 0);
    const totalAmount = Number(orderData.total_amount || 0);

    // Avoid double-counting: if paymentsSum exists, it already includes any ADV entry
    const totalPaid = paymentsSum > 0 ? paymentsSum : advancePayment;
    const remainingBalance = Math.max(0, totalAmount - totalPaid);

    return {
      totalPaid,
      remainingBalance,
      advancePayment,
      additionalPayments: paymentsSum
    };
  };

  // FIXED: Handle payment confirmation with proper bill creation
  const handleConfirmPayment = async () => {
    if (statusConfirmationDialog.order) {
      setStatusConfirmationDialog({ isOpen: false, order: null, newStatus: '', currentStatus: '' });
      
      // Store the order ID for later use in payment submission
      setProcessingOrderId(statusConfirmationDialog.order.id);
      
      const orderInfo = statusConfirmationDialog.order;
      console.log('🔍 Order info for payment:', orderInfo);
      
      const paymentInfo = getPaymentInfo(orderInfo);
      console.log('💰 Payment info calculated:', paymentInfo);
      
      // FIXED: Find actual caterer ID from database if possible
      let actualCatererId = null;
      try {
        const response = await fetch(`http://localhost:5000/api/caterers/find-by-phone/${orderInfo.caterer_phone}`);
        const result = await response.json();
        if (result.success && result.data) {
          actualCatererId = result.data.id;
        }
      } catch (error) {
        console.error('Error finding caterer:', error);
      }

      // FIXED: Create proper caterer object
      const caterer = {
        id: actualCatererId || orderInfo.id,
        caterer_name: orderInfo.caterer_name,
        phone_number: orderInfo.caterer_phone,
        caterer_phone: orderInfo.caterer_phone // Fallback field
      };
      
      // FIXED: Create proper bill data structure
      const billData = {
        id: orderInfo.id, // Order ID for reference
        caterer_id: actualCatererId || orderInfo.id,
        caterer_order_id: orderInfo.id,
        pending_amount: paymentInfo.remainingBalance,
        total_amount: orderInfo.total_amount,
        order_number: orderInfo.order_number,
        bill_number: `TEMP-${orderInfo.id}-${Date.now()}`,
        status: paymentInfo.remainingBalance > 0 ? 'pending' : 'paid'
      };
      
      console.log('🧾 Bill data being passed:', billData);
      console.log('👤 Caterer data being passed:', caterer);
      
      setPaymentCollectionDialog({
        isOpen: true,
        caterer: caterer,
        bill: billData // FIXED: Pass proper bill data instead of null
      });
    }
  };

  const handleCancelPayment = async () => {
    try {
      setIsPaymentLoading(true);
      const currentOrder = statusConfirmationDialog.order;
      setStatusConfirmationDialog({ isOpen: false, order: null, newStatus: '', currentStatus: '' });

      // Mark as delivered without payment
      const response = await fetch(`http://localhost:5000/api/caterer-orders/${currentOrder.id}/status`, {
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
        // Refresh both orders list and stats
        await Promise.all([
          fetchCatererOrders(),
          fetchStats()
        ]);
        console.log('✅ Order marked as delivered without payment');
      } else {
        console.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // FIXED: Enhanced payment submission handler
  const handlePaymentSubmit = async (formData) => {
    console.log('💳 handlePaymentSubmit called');
    console.log('📋 Processing order ID:', processingOrderId);
    
    try {
      setIsPaymentLoading(true);
      
      // Debug: Log FormData contents
      console.log('📝 FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      // Send FormData directly to the server (for file upload support)
      const response = await fetch('http://localhost:5000/api/caterer-orders/payments', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('💰 Payment response:', result);

      if (result.success) {
        // Payment recorded successfully, now mark order as delivered
        const deliverResponse = await fetch(`http://localhost:5000/api/caterer-orders/${processingOrderId}/status`, {
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
        console.log('🚚 Delivery response:', deliverResult);

        if (deliverResult.success) {
          // Refresh both orders list and stats
          await Promise.all([
            fetchCatererOrders(),
            fetchStats()
          ]);
          console.log('✅ Payment recorded and order marked as delivered successfully!');
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
      setIsPaymentLoading(false);
      setPaymentCollectionDialog({ isOpen: false, caterer: null, bill: null });
      setProcessingOrderId(null); // Reset the stored order ID
    }
  };

  const handleOrderAction = (order, action) => {
    // If action is "delivered", show payment confirmation dialog
    if (action === 'delivered') {
      handleDeliveredStatusClick(order);
      return;
    }

    // Map caterer statuses to customer order actions for other actions
    const actionMap = {
      'confirmed': 'approve',
      'processing': 'process',
      'ready': 'ship',
      'cancelled': 'cancel'
    };

    setConfirmationDialog({
      isOpen: true,
      order,
      action: actionMap[action] || action
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Caterer Orders</h1>
            <p className="text-gray-600 mt-1">Manage orders from caterer portal</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/caterer-orders/caterer-history')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <History className="h-4 w-4" />
              Caterer History
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[
            {
              id: 'total',
              label: 'Total',
              value: stats.today.total_orders,
              icon: Package,
              color: 'text-blue-600',
              bgColor: 'bg-blue-100'
            },
            {
              id: 'pending',
              label: 'Pending',
              value: stats.today.pending_orders,
              icon: Clock,
              color: 'text-yellow-600',
              bgColor: 'bg-yellow-100'
            },
            {
              id: 'processing',
              label: 'Processing',
              value: stats.today.processing_orders,
              icon: Package,
              color: 'text-purple-600',
              bgColor: 'bg-purple-100'
            },
            {
              id: 'ready',
              label: 'Out for Delivery',
              value: stats.today.ready_orders,
              icon: Building,
              color: 'text-orange-600',
              bgColor: 'bg-orange-100'
            },
            {
              id: 'delivered',
              label: 'Delivered',
              value: stats.today.delivered_orders,
              icon: CheckCircle,
              color: 'text-green-600',
              bgColor: 'bg-green-100'
            },
            {
              id: 'profit',
              label: 'Profit',
              value: formatCurrency(stats.today.total_profit || 0),
              icon: FileText,
              color: 'text-blue-600',
              bgColor: 'bg-blue-100'
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Card
                key={tab.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg'
                    : 'hover:shadow-md hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <CardContent className="p-4 mt-3 flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                      {tab.label}
                    </div>
                    <div className={`text-2xl font-bold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                      {tab.value}
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-200' : tab.bgColor}`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-700' : tab.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order number, caterer name, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div className="sm:w-48">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Note for pending orders */}
        {activeTab === 'pending' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 font-medium">
                Showing all pending orders regardless of date. Their profit will be added to today's total when delivered.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading caterer orders...</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : catererOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No caterer orders found</h3>
              <p className="text-gray-500">No orders match your current filters.</p>
            </CardContent>
          </Card>
        ) : activeTab === 'profit' ? (
          <Card>
            <CardHeader>
              <CardTitle>Caterer Profit Analysis</CardTitle>
              <CardDescription>Actual profit calculated from delivered orders only (caterer price - average cost price)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profit Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600">Delivered Revenue</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.today.delivered_revenue || 0)}</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600">Actual Profit</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.today.total_profit || 0)}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600">Profit Margin</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.today.delivered_revenue > 0
                      ? `${((stats.today.total_profit / stats.today.delivered_revenue) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                </div>
              </div>

              {/* Profit by Status */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-semibold mb-4">Profit Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Pending Orders</div>
                    <div className="text-lg font-bold text-yellow-600">
                      {stats.today.pending_orders}
                    </div>
                    <div className="text-xs text-gray-500">No profit until delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Processing Orders</div>
                    <div className="text-lg font-bold text-purple-600">
                      {stats.today.processing_orders}
                    </div>
                    <div className="text-xs text-gray-500">No profit until delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Ready Orders</div>
                    <div className="text-lg font-bold text-orange-600">
                      {stats.today.ready_orders}
                    </div>
                    <div className="text-xs text-gray-500">No profit until delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Delivered Orders</div>
                    <div className="text-lg font-bold text-green-600">
                      {stats.today.delivered_orders}
                    </div>
                    <div className="text-xs text-green-600">Profit: {formatCurrency(stats.today.total_profit || 0)}</div>
                  </div>
                </div>
              </div>

              <div className="text-center text-gray-500 text-sm">
                * Profit calculations are estimates based on average margins
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Caterer Orders</CardTitle>
              <CardDescription>{catererOrders.length} order{catererOrders.length !== 1 ? 's' : ''} found</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {catererOrders.map((order) => (
                <CatererOrderCard
                  key={order.id}
                  order={order}
                  onViewOrder={handleViewOrder}
                  onOrderAction={handleOrderAction}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <CatererOrderDetailsModal
          order={selectedOrder}
          isOpen={isOrderModalOpen}
          onClose={handleModalClose}
          onRefresh={handleRefresh}
        />
      )}

      {/* Status Confirmation Dialog - Using Customer Orders Dialog */}
      {confirmationDialog.order && (
        <OrderConfirmationDialog
          isOpen={confirmationDialog.isOpen}
          onClose={handleCancelStatusUpdate}
          onConfirm={handleConfirmStatusUpdate}
          order={confirmationDialog.order}
          action={confirmationDialog.action}
          isLoading={isConfirmationLoading}
        />
      )}

      {/* Status Confirmation Dialog */}
      {statusConfirmationDialog.order && (
        <CatererStatusConfirmationDialog
          isOpen={statusConfirmationDialog.isOpen}
          onClose={() => setStatusConfirmationDialog({ isOpen: false, order: null, newStatus: '', currentStatus: '' })}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
          onPaymentReceived={handleConfirmPayment}
          onNoPayment={handleCancelPayment}
          orderDetails={statusConfirmationDialog.order}
          newStatus={statusConfirmationDialog.newStatus}
          currentStatus={statusConfirmationDialog.currentStatus}
          isLoading={isPaymentLoading}
        />
      )}

      {/* Payment Collection Dialog */}
      {paymentCollectionDialog.isOpen && paymentCollectionDialog.caterer && paymentCollectionDialog.bill && (
        <CatererPaymentCollectionDialog
          isOpen={paymentCollectionDialog.isOpen}
          onClose={() => setPaymentCollectionDialog({ isOpen: false, caterer: null, bill: null })}
          onSubmit={handlePaymentSubmit}
          caterer={paymentCollectionDialog.caterer}
          bill={paymentCollectionDialog.bill}
          isLoading={isPaymentLoading}
        />
      )}
    </div>
  );
}

export default CatererOrdersPage;

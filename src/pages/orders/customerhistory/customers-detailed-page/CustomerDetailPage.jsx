import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../components/ui/collapsible';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Package,
  User, CreditCard, ChevronDown, ChevronRight
} from 'lucide-react';
import { useToast } from '../../../../contexts/ToastContext';
import PaymentCollectionDialog from './PaymentCollectionDialog';
import BillPaymentsDisplay from './BillPaymentsDisplay';

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Component to display bill items in a proper format
function BillItemsDisplay({ orderItems }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!orderItems) {
    return <span className="text-gray-400">No items data available</span>;
  }

  let items = [];
  try {
    if (typeof orderItems === 'string') {
      items = JSON.parse(orderItems);
    } else if (Array.isArray(orderItems)) {
      items = orderItems;
    } else {
      items = [orderItems];
    }
  } catch (e) {
    return <span className="text-gray-400">Invalid items data</span>;
  }

  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-gray-400">No items found</span>;
  }

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Items ({items.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.product_name || item.name || 'Unknown Item'}</div>
                <div className="text-xs text-gray-600">
                  {item.quantity || 1} {item.unit || 'pcs'} × {formatCurrency(item.unit_price || item.price || 0)}
                </div>
              </div>
              <div className="font-semibold text-sm">
                {formatCurrency(item.total_price || item.total || (item.quantity || 1) * (item.unit_price || item.price || 0))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function CustomerDetailPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const { showSuccess, showError } = useToast();
  
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [historyView, setHistoryView] = useState('bills'); // 'bills' or 'payments'
  const [billFilter, setBillFilter] = useState('all'); // 'all', 'outstanding', 'paid'
  const [paymentDialog, setPaymentDialog] = useState({
    isOpen: false,
    selectedBill: null
  });
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Fetch customer details from API
  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}`);
      const data = await response.json();

      if (data.success) {
        setCustomer(data.data.customer);
        setBills(data.data.bills || []);
        setPayments(data.data.payments || []);
      } else {
        showError('Failed to fetch customer details');
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      showError('Failed to fetch customer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  // Handle payment collection
  const handlePaymentSubmit = async (formData) => {
    try {
      setIsPaymentLoading(true);

      const response = await fetch(`${API_BASE_URL}/customers/payments`, {
        method: 'POST',
        body: formData // Send FormData directly for file upload
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to record payment');
      }

      showSuccess('Payment recorded successfully');
      setPaymentDialog({ isOpen: false, selectedBill: null });

      // Refresh customer data
      fetchCustomerDetails();

    } catch (error) {
      console.error('Error recording payment:', error);
      showError(error.message || 'Failed to record payment');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const openPaymentDialog = (bill = null) => {
    setPaymentDialog({
      isOpen: true,
      selectedBill: bill
    });
  };

  const closePaymentDialog = () => {
    setPaymentDialog({
      isOpen: false,
      selectedBill: null
    });
  };

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN');
  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };



  if (!customer && !loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Not Found</h1>
          <p className="text-gray-600 mb-4">The customer you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/orders/customer-history')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customer History
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !customer) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/orders/customer-history')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customer History
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-gray-600">Customer Details & Order History</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {customer.outstanding_balance > 0 && (
            <Button onClick={() => openPaymentDialog()} className="bg-green-600 hover:bg-green-700">
              <CreditCard className="h-4 w-4 mr-2" />
              Collect Money
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <span>{customer.address}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Customer since: {formatDate(customer.created_at)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-gray-500" />
                <span>Total Orders: {customer.total_orders}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Last Updated: {formatDate(customer.updated_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{customer.total_orders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(customer.total_amount)}</div>
          </CardContent>
        </Card>
        
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-red-50"
          onClick={() => {
            setActiveTab('history');
            setHistoryView('bills');
            setBillFilter('outstanding');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(customer.outstanding_balance)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {(() => {
                const outstandingCount = bills.filter(bill => parseFloat(bill.pending_amount || 0) > 0.01).length;
                return outstandingCount > 0
                  ? `${outstandingCount} bill${outstandingCount > 1 ? 's' : ''} pending • Click to view`
                  : 'All bills paid • Click to view';
              })()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(customer.total_paid)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Overview and History */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Bills */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bills && bills.length > 0 ? bills.slice(0, 3).map(bill => (
                    <div key={bill.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">{bill.bill_number}</div>
                        <div className="text-sm text-gray-600">{formatDate(bill.bill_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(bill.total_amount)}</div>
                        <Badge className="bg-green-100 text-green-800 border-green-200">{bill.status}</Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">
                      No bills found
                    </div>
                  )}
                </div>
                {(() => {
                  const outstandingCount = bills.filter(bill => parseFloat(bill.pending_amount || 0) > 0.01).length;
                  return outstandingCount > 0 ? (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveTab('history');
                          setHistoryView('bills');
                          setBillFilter('outstanding');
                        }}
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      >
                        View {outstandingCount} Outstanding Bill{outstandingCount > 1 ? 's' : ''}
                      </Button>
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments && payments.length > 0 ? payments.slice(0, 3).map(payment => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">Payment #{payment.id}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(payment.payment_date)} at {formatTime(payment.created_at)} • {payment.payment_method}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="font-medium text-green-600">{formatCurrency(payment.amount)}</div>
                          <Badge className="bg-green-100 text-green-800">completed</Badge>
                        </div>
                        {payment.receipt_image && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`${API_BASE_URL}/customers/images/receipts/${payment.receipt_image}`, '_blank')}
                            className="text-xs px-2 py-1"
                          >
                            Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">
                      No payments found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {historyView === 'bills' ? <Package className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    {historyView === 'bills' ? 'Bill History' : 'Payment History'}
                  </CardTitle>
                  <CardDescription>
                    {historyView === 'bills'
                      ? 'Complete list of all bills for this customer'
                      : 'Complete list of all payments received from this customer'
                    }
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={historyView === 'bills' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHistoryView('bills')}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Bills
                  </Button>
                  <Button
                    variant={historyView === 'payments' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHistoryView('payments')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payments
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {historyView === 'bills' && (
                <div className="mb-4 flex gap-2">
                  <Button
                    variant={billFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillFilter('all')}
                  >
                    All Bills
                  </Button>
                  <Button
                    variant={billFilter === 'outstanding' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillFilter('outstanding')}
                    className={billFilter === 'outstanding' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}
                  >
                    Outstanding
                    {(() => {
                      const outstandingCount = bills.filter(bill => parseFloat(bill.pending_amount || 0) > 0.01).length;
                      return outstandingCount > 0 ? (
                        <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                          {outstandingCount}
                        </Badge>
                      ) : null;
                    })()}
                  </Button>
                  <Button
                    variant={billFilter === 'paid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillFilter('paid')}
                    className={billFilter === 'paid' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-200 hover:bg-green-50'}
                  >
                    Paid
                  </Button>
                </div>
              )}
              {historyView === 'bills' ? (
                <div className="space-y-4">
                  {(() => {
                    // Filter bills based on selected filter
                    let filteredBills = bills || [];
                    if (billFilter === 'outstanding') {
                      filteredBills = bills.filter(bill => parseFloat(bill.pending_amount || 0) > 0.01);
                    } else if (billFilter === 'paid') {
                      filteredBills = bills.filter(bill => parseFloat(bill.pending_amount || 0) <= 0.01);
                    }

                    return filteredBills.length > 0 ? filteredBills.map(bill => {
                    const isPaid = parseFloat(bill.pending_amount || 0) <= 0.01;
                    const isPartiallyPaid = parseFloat(bill.paid_amount || 0) > 0 && !isPaid;

                    return (
                      <div key={bill.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                        {/* Bill Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 rounded-t-xl border-b border-gray-100">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-900">{bill.bill_number}</h3>
                                <Badge
                                  className={`${
                                    isPaid
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : isPartiallyPaid
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                        : 'bg-red-100 text-red-800 border-red-200'
                                  } font-medium`}
                                >
                                  {isPaid ? 'PAID' : isPartiallyPaid ? 'PARTIAL' : 'PENDING'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(bill.bill_date)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Package className="h-4 w-4" />
                                  <span>Order #{bill.order_id}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">{formatCurrency(bill.total_amount)}</div>
                              <div className="text-sm text-gray-500">Total Amount</div>
                            </div>
                          </div>
                        </div>

                        {/* Bill Details */}
                        <div className="px-6 py-4">
                          {/* Amount Breakdown */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subtotal</div>
                              <div className="text-lg font-semibold text-gray-900">{formatCurrency(bill.subtotal || 0)}</div>
                            </div>
                            {bill.delivery_fee > 0 && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery</div>
                                <div className="text-lg font-semibold text-gray-900">{formatCurrency(bill.delivery_fee)}</div>
                              </div>
                            )}
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-600 uppercase tracking-wide">Paid</div>
                              <div className="text-lg font-semibold text-green-700">{formatCurrency(bill.paid_amount)}</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                              <div className="text-xs font-medium text-red-600 uppercase tracking-wide">Outstanding</div>
                              <div className="text-lg font-semibold text-red-700">{formatCurrency(bill.pending_amount)}</div>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="mb-4">
                            <BillItemsDisplay orderItems={bill.order_items} />
                          </div>

                          {/* Payments */}
                          <div className="mb-4">
                            <BillPaymentsDisplay billId={bill.id} />
                          </div>

                          {/* Collect Payment Button */}
                          {!isPaid && (
                            <div className="flex justify-end mb-4">
                              <Button
                                onClick={() => openPaymentDialog(bill)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Collect Payment
                              </Button>
                            </div>
                          )}

                          {/* Notes */}
                          {bill.notes && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <div className="text-amber-600 mt-0.5">
                                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-amber-800">Notes</div>
                                  <div className="text-sm text-amber-700">{bill.notes}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    }) : (
                      <div className="text-center text-gray-500 py-8">
                        <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {billFilter === 'outstanding' ? 'No outstanding bills' :
                           billFilter === 'paid' ? 'No paid bills' : 'No bills found'}
                        </h3>
                        <p className="text-gray-500">
                          {billFilter === 'outstanding' ? 'All bills have been fully paid.' :
                           billFilter === 'paid' ? 'No bills have been paid yet.' :
                           'This customer doesn\'t have any bills yet.'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-4">
                  {payments && payments.length > 0 ? payments.map(payment => (
                    <div key={payment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">Payment #{payment.id}</h4>
                          <p className="text-sm text-gray-600">
                            {formatDate(payment.payment_date)} at {formatTime(payment.created_at)} • {payment.payment_method}
                          </p>
                          {payment.reference_number && (
                            <p className="text-sm text-gray-500">Ref: {payment.reference_number}</p>
                          )}
                          {payment.bill_id && (
                            <p className="text-sm text-gray-500">Bill ID: {payment.bill_id}</p>
                          )}
                          {payment.notes && (
                            <p className="text-sm text-gray-500">Notes: {payment.notes}</p>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <div className="font-semibold text-lg text-green-600">{formatCurrency(payment.amount)}</div>
                            <Badge className="bg-green-100 text-green-800">completed</Badge>
                          </div>
                          {payment.receipt_image && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`${API_BASE_URL}/customers/images/receipts/${payment.receipt_image}`, '_blank')}
                              className="text-xs"
                            >
                              View Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                      {payment.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium text-gray-700">Notes:</p>
                          <p className="text-sm text-gray-600">{payment.notes}</p>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-8">
                      <CreditCard className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                      <p className="text-gray-500">This customer hasn't made any payments yet.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Collection Dialog */}
      <PaymentCollectionDialog
        isOpen={paymentDialog.isOpen}
        onClose={closePaymentDialog}
        onPaymentSubmit={handlePaymentSubmit}
        customer={customer}
        bills={bills}
        selectedBill={paymentDialog.selectedBill}
        isLoading={isPaymentLoading}
      />
    </div>
  );
}

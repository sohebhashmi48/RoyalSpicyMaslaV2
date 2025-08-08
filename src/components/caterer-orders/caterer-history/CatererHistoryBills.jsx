import React, { useState } from 'react';
import {
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  CreditCard,
  ChevronDown,
  ChevronRight,
  FileText,
  User,
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  History,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';


// Component to display bill items in a proper format (same as customer bills)
function BillItemsDisplay({ orderItems, formatCurrency }) {
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


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Items ({items.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          {items.map((item, index) => (
            <div key={index} className="py-2 border-b border-gray-200 last:border-b-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {item.product_name || item.name || 'Unknown Item'}
                    {item.mix_number && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        Mix #{item.mix_number}
                      </Badge>
                    )}
                    {item.is_custom && (
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    {item.quantity || 1} {item.unit || 'pcs'} × {formatCurrency(item.unit_price || item.price || 0)}
                  </div>
                  
                  {/* Mix Components */}
                  {item.mix_number && (() => {
                    // Try to get mix components from various possible sources
                    let mixComponents = null;
                    
                    // First try the standard mix_components
                    if (item.mix_components && item.mix_components.length > 0) {
                      mixComponents = item.mix_components;
                    }
                    // Try parsing custom_details if it exists
                    else if (item.custom_details) {
                      try {
                        const customDetails = typeof item.custom_details === 'string' 
                          ? JSON.parse(item.custom_details) 
                          : item.custom_details;
                        
                        // Check for mixDetails.items (the correct location based on the JSON structure)
                        if (customDetails && customDetails.mixDetails && customDetails.mixDetails.items && customDetails.mixDetails.items.length > 0) {
                          mixComponents = customDetails.mixDetails.items;
                        }
                        // Check for mixItems in customDetails
                        else if (customDetails && customDetails.mixItems && customDetails.mixItems.length > 0) {
                          mixComponents = customDetails.mixItems;
                        }
                        // Check for components in customDetails
                        else if (customDetails && customDetails.components && customDetails.components.length > 0) {
                          mixComponents = customDetails.components;
                        }
                      } catch (e) {
                        console.error('Error parsing custom_details:', e);
                      }
                    }


                    if (mixComponents && mixComponents.length > 0) {
                      return (
                        <div className="mt-2 pl-4 border-l-2 border-blue-200">
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Contains:
                          </div>
                          <div className="space-y-1">
                            {mixComponents.map((component, compIndex) => (
                              <div key={compIndex} className="text-xs text-gray-600 flex justify-between">
                                <span>• {component.name || component.product_name || 'Unknown Item'}</span>
                                <span>
                                  {(component.calculatedQuantity || component.quantity || 0).toFixed(3)} {component.unit || 'kg'} = {formatCurrency(component.actualCost || component.total || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="font-semibold text-sm">
                  {formatCurrency(item.total_price || item.total || (item.quantity || 1) * (item.unit_price || item.price || 0))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}


// Component to display payments for a specific bill (same as customer bills)
function BillPaymentsDisplay({ paymentHistory, formatCurrency, formatDate, formatTime }) {
  const [isOpen, setIsOpen] = useState(false);


  if (!paymentHistory || paymentHistory.length === 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <CreditCard className="h-4 w-4" />
          Payments
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <div className="text-sm text-gray-500">No payments made for this bill yet</div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }


  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return '💵';
      case 'upi': return '📱';
      case 'card': return '💳';
      case 'bank_transfer': return '🏦';
      case 'cheque': return '📝';
      default: return '💰';
    }
  };


  // Get payment method label
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'bank_transfer': return 'Bank Transfer';
      case 'cheque': return 'Cheque';
      default: return method;
    }
  };


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <CreditCard className="h-4 w-4" />
        Payments ({paymentHistory.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="space-y-3">
          {paymentHistory.map((payment, index) => (
            <div key={payment.id || index} className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getPaymentMethodIcon(payment.payment_method)}</span>
                    <span className="font-medium text-green-800">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </span>
                    <span className="text-lg font-bold text-green-700">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(payment.payment_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(payment.created_at)}</span>
                    </div>
                  </div>


                  {payment.reference_number && (
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Ref:</span> {payment.reference_number}
                    </div>
                  )}


                  {payment.notes && (
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Notes:</span> {payment.notes}
                    </div>
                  )}
                </div>


                {payment.receipt_image && (
                  <div className="ml-4">
                    <button
                      onClick={() => window.open(`http://localhost:5000/uploads/caterer-receipts/${payment.receipt_image}`)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                      title="View Receipt"
                    >
                      <Eye className="h-3 w-3" />
                      Receipt
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}


const CatererHistoryBills = ({
  bills,
  activeTab,
  formatCurrency,
  formatDate,
  formatDateTime,
  openPaymentDialog
}) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };


  if (bills.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Bills Found</h3>
        <p className="text-gray-500">
          {activeTab === 'all'
            ? 'No bills found matching your criteria.'
            : `No ${activeTab} bills found.`
          }
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {bills.map((bill) => {
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
                      <span>Order #{bill.order_number}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>{bill.caterer_name}</span>
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
                  <div className="text-lg font-semibold text-green-700">{formatCurrency(bill.paid_amount || 0)}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-600 uppercase tracking-wide">Outstanding</div>
                  <div className="text-lg font-semibold text-red-700">{formatCurrency(bill.pending_amount || 0)}</div>
                </div>
              </div>


              {/* Items */}
              <div className="mb-4">
                <BillItemsDisplay orderItems={bill.items} formatCurrency={formatCurrency} />
              </div>


              {/* Payments */}
              <div className="mb-4">
                <BillPaymentsDisplay 
                  paymentHistory={bill.payment_history} 
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              </div>


              {/* Collect Payment Button - FIXED */}
              {!isPaid && (
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={() => openPaymentDialog(bill, {
                      id: bill.caterer_id,
                      name: bill.caterer_name,
                      phone: bill.caterer_phone,
                      email: bill.caterer_email,
                      address: bill.caterer_address
                    })}
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
      })}
    </div>
  );
};


export default CatererHistoryBills;

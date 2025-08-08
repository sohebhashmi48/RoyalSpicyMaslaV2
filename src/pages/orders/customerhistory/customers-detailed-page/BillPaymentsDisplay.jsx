import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, Clock, FileImage, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../components/ui/collapsible';

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Component to display payments for a specific bill
function BillPaymentsDisplay({ billId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceiptImage, setCurrentReceiptImage] = useState(null);

  // Fetch payments for the bill
  useEffect(() => {
    if (billId && isOpen) {
      fetchBillPayments();
    }
  }, [billId, isOpen]);

  const fetchBillPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/customers/bills/${billId}/payments`);
      const result = await response.json();
      
      if (result.success) {
        setPayments(result.data);
      } else {
        console.error('Failed to fetch bill payments:', result.message);
      }
    } catch (error) {
      console.error('Error fetching bill payments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return '💵';
      case 'upi':
        return '📱';
      case 'card':
        return '💳';
      case 'bank_transfer':
        return '🏦';
      case 'cheque':
        return '📝';
      default:
        return '💰';
    }
  };

  // Get payment method label
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'upi':
        return 'UPI';
      case 'card':
        return 'Card';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'cheque':
        return 'Cheque';
      default:
        return method;
    }
  };

  // Handle receipt view
  const handleViewReceipt = (receiptImage) => {
    setCurrentReceiptImage(`${API_BASE_URL}/customers/images/receipts/${receiptImage}`);
    setShowReceiptModal(true);
  };

  // Close receipt modal
  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setCurrentReceiptImage(null);
  };

  if (!billId) {
    return null;
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <CreditCard className="h-4 w-4" />
          Payments ({payments.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          {loading ? (
            <div className="text-center py-4">
              <div className="text-sm text-gray-500">Loading payments...</div>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <div className="text-sm text-gray-500">No payments made for this bill yet</div>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
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
                          onClick={() => handleViewReceipt(payment.receipt_image)}
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
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Receipt Modal */}
      {showReceiptModal && currentReceiptImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Payment Receipt</h3>
              <button
                onClick={closeReceiptModal}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="flex justify-center">
                <img
                  src={currentReceiptImage}
                  alt="Payment Receipt"
                  className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="hidden text-center text-gray-500 py-8">
                  <FileImage className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p>Unable to load receipt image</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BillPaymentsDisplay;

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertCircle, CheckCircle, XCircle, Clock, Truck, Package, CreditCard } from 'lucide-react';

export default function CatererStatusConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  orderDetails,
  newStatus,
  currentStatus,
  isLoading = false,
  onPaymentReceived,
  onNoPayment
}) {
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  
  const formatCurrency = (amount) => `₹${amount?.toLocaleString('en-IN') || 0}`;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'confirmed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          title: 'Accept Order',
          question: 'Accept this order?'
        };
      case 'processing':
        return {
          icon: Package,
          color: 'text-blue-600',
          title: 'Start Processing',
          question: 'Start processing this order?'
        };
      case 'ready':
        return {
          icon: Clock,
          color: 'text-orange-600',
          title: 'Mark as Ready',
          question: 'Is this order ready for delivery?'
        };
      case 'delivered':
        return {
          icon: Truck,
          color: 'text-purple-600',
          title: 'Mark as Delivered',
          question: showPaymentConfirmation ? 'Did you receive payment for this order?' : 'Confirm order delivery?'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'text-red-600',
          title: 'Cancel Order',
          question: 'Are you sure you want to cancel this order?'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          title: 'Update Status',
          question: 'Update the order status?'
        };
    }
  };

  // Handle the initial delivered confirmation
  const handleDeliveredConfirm = () => {
    if (newStatus === 'delivered') {
      setShowPaymentConfirmation(true);
    } else {
      onConfirm();
    }
  };

  // Prevent race condition by ensuring state is stable before showing payment options
  const isPaymentMode = showPaymentConfirmation && newStatus === 'delivered';

  // ✅ FIXED: Renamed to avoid shadowing props and added safety checks
  const handlePaymentReceivedClick = () => {
    // Only proceed if we're actually in payment mode
    if (!showPaymentConfirmation || newStatus !== 'delivered') {
      return;
    }
    
    setShowPaymentConfirmation(false);
    if (typeof onPaymentReceived === 'function') {
      onPaymentReceived();
    } else {
      console.error('onPaymentReceived is not a function:', onPaymentReceived);
      // Fallback behavior - just close dialog
      onCancel();
    }
  };

  // ✅ FIXED: Renamed to avoid shadowing props and added safety checks
  const handleNoPaymentClick = () => {
    // Only proceed if we're actually in payment mode
    if (!showPaymentConfirmation || newStatus !== 'delivered') {
      return;
    }
    
    setShowPaymentConfirmation(false);
    if (typeof onNoPayment === 'function') {
      onNoPayment();
    } else {
      console.error('onNoPayment is not a function:', onNoPayment);
      // Fallback behavior - just close dialog
      onCancel();
    }
  };

  // Handle dialog close/cancel
  const handleCancel = () => {
    setShowPaymentConfirmation(false);
    onCancel();
  };

  if (!orderDetails || !newStatus) return null;

  const statusInfo = getStatusInfo(newStatus);
  const StatusIcon = statusInfo.icon;

  // Calculate payment info for delivered orders
  const totalAmount = Number(orderDetails.total_amount || 0);
  const paidAmount = Number(orderDetails.payment_amount || orderDetails.total_paid_amount || 0);
  const remainingBalance = Math.max(0, totalAmount - paidAmount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full mx-4 p-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            {showPaymentConfirmation ? (
              <CreditCard className="h-5 w-5 text-purple-600" />
            ) : (
              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            )}
            <div>
              <div className="font-semibold">
                {showPaymentConfirmation ? 'Payment Collection' : statusInfo.title}
              </div>
              <div className="text-sm font-normal text-gray-500">#{orderDetails.order_number}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Caterer:</span>
              <span className="font-medium">{orderDetails.caterer_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-semibold text-blue-600">{formatCurrency(orderDetails.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
            </div>
            {!showPaymentConfirmation && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="capitalize">{currentStatus} → <span className={statusInfo.color}>{newStatus}</span></span>
              </div>
            )}
            {showPaymentConfirmation && remainingBalance > 0 && (
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600 font-medium">Balance Due:</span>
                <span className="font-semibold text-orange-600">{formatCurrency(remainingBalance)}</span>
              </div>
            )}
          </div>

          {/* Question */}
          <div className="text-center py-2">
            <p className="text-gray-700 font-medium">{statusInfo.question}</p>
            {isPaymentMode && (
              <p className="text-xs text-purple-600 mt-2">
                {remainingBalance > 0 
                  ? `Outstanding balance: ${formatCurrency(remainingBalance)}`
                  : 'Order is fully paid'
                }
              </p>
            )}
            {newStatus === 'delivered' && !showPaymentConfirmation && (
              <p className="text-xs text-purple-600 mt-2">
                You'll be asked about payment after confirming delivery
              </p>
            )}
            {newStatus === 'cancelled' && (
              <p className="text-xs text-red-600 mt-2">
                This action cannot be undone
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>

            {isPaymentMode ? (
              <>
                <Button
                  onClick={handleNoPaymentClick}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  No Payment
                </Button>
                <Button
                  onClick={handlePaymentReceivedClick}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Yes, Received
                </Button>
              </>
            ) : (
              <Button
                onClick={handleDeliveredConfirm}
                disabled={isLoading}
                className={`flex-1 ${
                  newStatus === 'cancelled' ? 'bg-red-600 hover:bg-red-700' :
                  newStatus === 'confirmed' ? 'bg-green-600 hover:bg-green-700' :
                  newStatus === 'processing' ? 'bg-blue-600 hover:bg-blue-700' :
                  newStatus === 'ready' ? 'bg-orange-600 hover:bg-orange-700' :
                  newStatus === 'delivered' ? 'bg-purple-600 hover:bg-purple-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </div>
                ) : (
                  <>
                    <StatusIcon className="h-4 w-4 mr-2" />
                    Confirm
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Info Text */}
          {isPaymentMode && (
            <div className="text-xs text-gray-500 text-center bg-gray-50 rounded-lg p-3">
              <strong>Yes, Received:</strong> Record payment details<br/>
              <strong>No Payment:</strong> Mark as delivered with pending payment
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

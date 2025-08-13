import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  CreditCard, AlertCircle, IndianRupee,
  Calculator, CheckCircle, Loader2, Receipt, FileImage,
  Building
} from 'lucide-react';

export default function CatererPaymentCollectionDialog({
  isOpen,
  onClose,
  onSubmit,
  caterer,
  bill = null,
  isLoading = false
}) {

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
    receiptFile: null
  });
  const [errors, setErrors] = useState({});

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  
  useEffect(() => {
    if (isOpen && bill) {
      console.log('Setting up payment dialog with bill:', bill);
      setPaymentData({
        amount: bill.pending_amount > 0 ? bill.pending_amount.toString() : '',
        paymentMethod: 'cash',
        referenceNumber: '',
        notes: bill.order_number ? `Payment for order ${bill.order_number}` : '',
        receiptFile: null
      });
      setErrors({});
    }
  }, [isOpen, bill]);

  // Handle amount changes with validation - FIXED
  const handleAmountChange = (value) => {
    setPaymentData(prev => ({ ...prev, amount: value }));
    setErrors(prev => ({ ...prev, amount: '' }));

    // Real-time validation
    if (bill && bill.pending_amount > 0) {
      const amount = parseFloat(value || 0);
      const maxAmount = parseFloat(bill.pending_amount || 0);
      if (amount > maxAmount) {
        setErrors(prev => ({ ...prev, amount: `Amount cannot exceed ${formatCurrency(maxAmount)}` }));
      }
    }
  };

  // Handle file upload
    const handleFileUpload = (event) =>{ 
      const file = event.target.files[0];
      const validTypes = ["image/svg+xml", "image/png", "image/jpeg"];
      
      if (!validTypes.includes(file.type)) { //svg png or jpeg allowed
        toast.error("Invalid file type. Please upload an SVG, PNG, or JPEG image.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, receipt: 'File size must be less than 5MB' }));
        return;
      }
      setPaymentData(prev => ({ ...prev, receiptFile: file }));
      setErrors(prev => ({ ...prev, receipt: '' }));
    };
  

// Validation function - FIXED
const validatePayment = () => {
  const newErrors = {};
  const amount = parseFloat(paymentData.amount || 0);

  if (amount <= 0) {
    newErrors.amount = 'Amount must be greater than 0';
  }

  if (bill && bill.pending_amount > 0) {
    const maxAmount = parseFloat(bill.pending_amount || 0);
    if (amount > maxAmount) {
      newErrors.amount = `Amount cannot exceed ${formatCurrency(maxAmount)}`;
    }
  }

  if (paymentData.paymentMethod === 'upi' || paymentData.paymentMethod === 'bank_transfer') {
    if (!paymentData.referenceNumber.trim()) {
      newErrors.referenceNumber = 'Reference number is required for this payment method';
    }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// Submit payment - FIXED
const handleSubmit = async () => {
  if (!validatePayment()) return;

  try {
    // Create FormData for file upload
    const formData = new FormData();

    // Enhanced FormData for caterer payments - matching backend expectations
    formData.append('caterer_phone', caterer.phone || caterer.phone_number || caterer.caterer_phone);
    formData.append('caterer_name', caterer.caterer_name);
    formData.append('order_id', bill.caterer_order_id || bill.id);
    formData.append('amount', parseFloat(paymentData.amount));
    formData.append('paymentMethod', paymentData.paymentMethod);
    formData.append('notes', paymentData.notes || '');

    // Add caterer ID if available
    if (caterer.id) {
      formData.append('caterer_id', caterer.id);
    }

    // Add bill ID if available
    if (bill.bill_id || bill.id) {
      formData.append('bill_id', bill.bill_id || bill.id);
    }

    if (paymentData.referenceNumber) {
      formData.append('referenceNumber', paymentData.referenceNumber);
    }

    if (paymentData.receiptFile) {
      formData.append('receipt_image', paymentData.receiptFile);
    }


    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }

    if (typeof onSubmit === 'function') {
      await onSubmit(formData);
    } else {
      console.error('onSubmit is not a function:', typeof onSubmit);
      throw new Error('Payment submission handler not provided');
    }
  } catch (error) {
    console.error('Error preparing payment data:', error);
  }
};

// ADDED: Check if we have valid data - SINGLE CHECK
if (!caterer) {
  console.error('❌ No caterer data provided to payment dialog');
  return null;
}

if (!bill) {
  console.error('❌ No bill data provided to payment dialog');
  console.error('   This means the payment calculation failed');
  return null;
}

// ADDED: Get pending amount and check if there's balance
const pendingAmount = parseFloat(bill.pending_amount || 0);
const hasBalance = pendingAmount > 0;

return (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] p-0 flex flex-col">
      <DialogHeader className="space-y-3 p-4 pb-3 border-b border-gray-200 flex-shrink-0">
        <DialogTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <Building className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="font-bold">Record Caterer Payment</div>
            <div className="text-sm font-normal text-gray-600">{caterer.caterer_name}</div>
            {/* ADDED: Show order number if available */}
            {bill.order_number && (
              <div className="text-xs font-normal text-gray-500">Order: {bill.order_number}</div>
            )}
            {/* Show caterer phone */}
            <div className="text-xs font-normal text-gray-500">
              📞 {caterer.phone_number || caterer.caterer_phone}
            </div>
          </div>
        </DialogTitle>
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div>
            <div className="text-sm text-gray-600">Outstanding Balance</div>
            {/* FIXED: Show proper color based on balance */}
            <div className={`text-xl font-bold ${hasBalance ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(pendingAmount)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Order Total</div>
            <div className="text-lg font-bold text-blue-600">{formatCurrency(bill.total_amount || 0)}</div>
          </div>
        </div>

        {/* ADDED: Show message if order is fully paid */}
        {!hasBalance && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>This caterer order is fully paid. You can still record additional payments if needed.</span>
            </div>
          </div>
        )}
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {/* Payment Amount */}
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-green-600" />
                Payment Amount *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              <div>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="Enter payment amount"
                    value={paymentData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pl-9 h-10 text-lg font-semibold border-2 focus:border-green-500 bg-white"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                {errors.amount && (
                  <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.amount}</span>
                  </div>
                )}
                {/* FIXED: Show outstanding amount instead of maximum */}
                {hasBalance && (
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-600">
                      Outstanding: {formatCurrency(pendingAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Amount Buttons - FIXED: Only show if there's balance */}
              {hasBalance && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAmountChange(pendingAmount.toString())}
                    className="h-8 text-xs"
                  >
                    Full Balance
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAmountChange((pendingAmount / 2).toString())}
                    className="h-8 text-xs"
                  >
                    Half Balance
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method & Reference */}
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              <select
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-sm transition-colors"
              >
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
                <option value="card">💳 Card</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="cheque">📄 Cheque</option>
              </select>

              {/* Reference Number (if needed) */}
              {(paymentData.paymentMethod === 'upi' || paymentData.paymentMethod === 'bank_transfer') && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">Reference Number</label>
                  <Input
                    placeholder="Enter transaction reference number"
                    value={paymentData.referenceNumber}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    className="h-8 border-2 focus:border-green-500 transition-colors text-sm"
                  />
                  {errors.referenceNumber && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.referenceNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipt Upload */}
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileImage className="h-4 w-4 text-purple-600" />
                Receipt (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-green-400 transition-colors min-h-[80px] flex items-center justify-center">
                <input
                  type="file"
                  accept="image/svg/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-1">
                    {paymentData.receiptFile ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div className="text-xs font-medium text-green-600">
                          {paymentData.receiptFile.name}
                        </div>
                      </>
                    ) : (
                      <>
                        <FileImage className="h-5 w-5 text-gray-400" />
                        <div className="text-xs font-medium text-gray-600">
                          Click to upload receipt
                        </div>
                      </>
                    )}
                  </div>
                </label>
              </div>
              {errors.receipt && (
                <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.receipt}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-base">Payment Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <textarea
                placeholder="Add any notes about this caterer payment..."
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-sm resize-none transition-colors"
                rows={2}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center p-4 pt-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="text-sm text-gray-600">
          {paymentData.amount && (
            <div className="flex items-center gap-2">
              <Calculator className="h-3 w-3" />
              <span>Payment: {formatCurrency(paymentData.amount)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="px-4 text-sm h-9">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
            className="px-4 text-sm h-9 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Record Payment
              </>
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
}

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  CreditCard, AlertCircle, IndianRupee,
  Calculator, CheckCircle, Loader2, Receipt, FileImage
} from 'lucide-react';

export default function PaymentCollectionDialog({
  isOpen,
  onClose,
  onPaymentSubmit,
  customer,
  bills = [],
  selectedBill = null,
  isLoading = false
}) {
  // State management
  const [step, setStep] = useState(1); // 1: Payment Type, 2: Bill Selection, 3: Amount Distribution
  const [paymentType, setPaymentType] = useState(selectedBill ? 'bill-specific' : 'general');
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
    receiptFile: null
  });
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(selectedBill);
  const [selectedBillsForDistribution, setSelectedBillsForDistribution] = useState([]);
  const [errors, setErrors] = useState({});
  const [amountDistribution, setAmountDistribution] = useState({});

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPaymentType(selectedBill ? 'bill-specific' : 'general');
      setPaymentData({
        amount: '',
        paymentMethod: 'cash',
        referenceNumber: '',
        notes: '',
        receiptFile: null
      });
      setSelectedBillForPayment(selectedBill);
      setSelectedBillsForDistribution([]);
      setErrors({});
      setAmountDistribution({});
    }
  }, [isOpen, selectedBill]);

  // Auto-fill amount for bill-specific payments
  useEffect(() => {
    if (paymentType === 'bill-specific' && selectedBillForPayment) {
      setPaymentData(prev => ({
        ...prev,
        amount: selectedBillForPayment.pending_amount.toString()
      }));
    }
  }, [paymentType, selectedBillForPayment]);

  // Validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid payment amount';
    }

    if (paymentType === 'bill-specific' && !selectedBillForPayment) {
      newErrors.bill = 'Please select a bill for payment';
    }

    if (paymentType === 'general' && selectedBillsForDistribution.length === 0) {
      newErrors.bills = 'Please select at least one bill for payment distribution';
    }

    // Validate amount distribution for general payments
    if (paymentType === 'general' && selectedBillsForDistribution.length > 0) {
      const totalDistributed = Object.values(amountDistribution).reduce((sum, amount) => sum + parseFloat(amount || 0), 0);
      const paymentAmount = parseFloat(paymentData.amount || 0);
      
      if (Math.abs(totalDistributed - paymentAmount) > 0.01) {
        newErrors.distribution = `Total distributed amount (${formatCurrency(totalDistributed)}) must equal payment amount (${formatCurrency(paymentAmount)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle payment submission
  const handleSubmit = () => {
    if (!validateForm()) return;

    const submissionData = {
      ...paymentData,
      amount: parseFloat(paymentData.amount),
      paymentType,
      selectedBill: paymentType === 'bill-specific' ? selectedBillForPayment : null,
      billDistribution: paymentType === 'general' ? amountDistribution : null,
      customerId: customer?.id
    };

    onPaymentSubmit(submissionData);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, file: 'File size must be less than 5MB' }));
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, file: 'Only JPG, PNG, and PDF files are allowed' }));
        return;
      }

      setPaymentData(prev => ({ ...prev, receiptFile: file }));
      setErrors(prev => ({ ...prev, file: null }));
    }
  };

  // Calculate total outstanding
  const totalOutstanding = bills.reduce((sum, bill) => sum + parseFloat(bill.pending_amount || 0), 0);

  // Get pending bills only
  const pendingBills = bills.filter(bill => parseFloat(bill.pending_amount) > 0);

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="font-bold">Collect Payment</div>
              <div className="text-sm font-normal text-gray-600">{customer.name} - {customer.phone}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Outstanding Summary */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-5">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-700">Total Outstanding</div>
                  <div className="text-2xl font-bold text-green-700">{formatCurrency(totalOutstanding)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">This Bill</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {selectedBill ? formatCurrency(selectedBill.pending_amount) : formatCurrency(paymentData.amount || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Details */}
          {selectedBill && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  Bill Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Bill Number</div>
                    <div className="font-semibold">{selectedBill.bill_number}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Bill Date</div>
                    <div className="font-semibold">{new Date(selectedBill.bill_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Total Amount</div>
                    <div className="font-semibold text-blue-600">{formatCurrency(selectedBill.total_amount)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Pending Amount</div>
                    <div className="font-semibold text-red-600">{formatCurrency(selectedBill.pending_amount)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
                <option value="card">💳 Card</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="cheque">📝 Cheque</option>
              </select>
            </CardContent>
          </Card>

          {/* Payment Amount and Receipt Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Payment Amount */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                  Payment Amount <span className="text-red-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter payment amount"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
                {errors.amount && (
                  <div className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.amount}
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  Maximum: {formatCurrency(selectedBill ? selectedBill.pending_amount : totalOutstanding)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentData(prev => ({ ...prev, amount: (selectedBill ? selectedBill.pending_amount : totalOutstanding).toString() }))}
                    className="h-10"
                  >
                    Full Amount
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentData(prev => ({ ...prev, amount: ((selectedBill ? selectedBill.pending_amount : totalOutstanding) / 2).toString() }))}
                    className="h-10"
                  >
                    Half Amount
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right: Receipt Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-purple-600" />
                  Receipt Upload (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors h-32 flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      {paymentData.receiptFile ? (
                        <>
                          <CheckCircle className="h-8 w-8 text-green-500" />
                          <div className="text-sm font-medium text-green-600">
                            {paymentData.receiptFile.name}
                          </div>
                          <div className="text-xs text-gray-500">Click to change</div>
                        </>
                      ) : (
                        <>
                          <FileImage className="h-8 w-8 text-gray-400" />
                          <div className="text-sm font-medium text-gray-600">
                            Click to upload receipt
                          </div>
                          <div className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</div>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                {errors.file && (
                  <div className="flex items-center gap-2 mt-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{errors.file}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Add any notes about this payment..."
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-sm resize-none"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
          <div className="text-sm text-gray-600">
            {paymentData.amount && (
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span>Payment: {formatCurrency(paymentData.amount)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="px-6 w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
              className="px-6 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
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

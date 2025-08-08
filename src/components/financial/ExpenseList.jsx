import { useState } from 'react';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  PhotoIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { useSafety } from '../../contexts/SafetyContext';
import SafetyDialog from '../common/SafetyDialog';
import ViewExpenseDialog from './ViewExpenseDialog';

const ExpenseList = ({ expenses, onExpenseUpdated, onEditExpense, isLoading = false }) => {
  const { showSuccess, showError } = useToast();
  const { requiresSafetyCheck } = useSafety();
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleViewExpense = (expense) => {
    setSelectedExpense(expense);
    setShowViewDialog(true);
  };

  const handleEditExpense = (expense) => {
    if (requiresSafetyCheck('edit')) {
      setSelectedExpense(expense);
      setPendingAction('edit');
      setShowSafetyDialog(true);
    } else {
      if (onEditExpense) {
        onEditExpense(expense);
      }
    }
  };

  const handleDeleteExpense = (expense) => {
    if (requiresSafetyCheck('delete')) {
      setSelectedExpense(expense);
      setPendingAction('delete');
      setShowSafetyDialog(true);
    } else {
      performDelete(expense);
    }
  };

  const handleSafetyConfirm = () => {
    if (pendingAction === 'edit' && selectedExpense) {
      onEditExpense(selectedExpense);
    } else if (pendingAction === 'delete' && selectedExpense) {
      performDelete(selectedExpense);
    }
    setShowSafetyDialog(false);
    setPendingAction(null);
    setSelectedExpense(null);
  };

  const performDelete = async (expense) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/expenses/${expense.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Expense deleted successfully');
        if (onExpenseUpdated) {
          onExpenseUpdated();
        }
      } else {
        showError(data.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      showError('Failed to delete expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Loading expenses...</h3>
        <p className="text-gray-600">Please wait while we fetch your expense data.</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <CurrencyDollarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
        <p className="text-gray-600">Start by adding your first expense to track your spending.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {expense.expense_name}
                      </div>
                      {expense.notes && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {expense.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(expense.expense_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(expense.expense_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {expense.receipt_image ? (
                      <div className="flex items-center">
                        <PhotoIcon className="h-5 w-5 text-green-500" />
                        <span className="ml-1 text-xs text-green-600">Available</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <PhotoIcon className="h-5 w-5 text-gray-300" />
                        <span className="ml-1 text-xs text-gray-400">None</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleViewExpense(expense)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="text-orange-600 hover:text-orange-900 p-1 rounded-md hover:bg-orange-50"
                        title="Edit Expense"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 disabled:opacity-50"
                        title="Delete Expense"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Dialog */}
      {showSafetyDialog && (
        <SafetyDialog
          isOpen={showSafetyDialog}
          onClose={() => {
            setShowSafetyDialog(false);
            setPendingAction(null);
            setSelectedExpense(null);
          }}
          onConfirm={handleSafetyConfirm}
          title={`${pendingAction === 'edit' ? 'Edit' : 'Delete'} Expense`}
          message={`Are you sure you want to ${pendingAction} the expense "${selectedExpense?.expense_name}"?`}
          actionType={pendingAction}
        />
      )}

      {/* View Expense Dialog */}
      {showViewDialog && selectedExpense && (
        <ViewExpenseDialog
          isOpen={showViewDialog}
          onClose={() => {
            setShowViewDialog(false);
            setSelectedExpense(null);
          }}
          expense={selectedExpense}
        />
      )}
    </>
  );
};

export default ExpenseList;

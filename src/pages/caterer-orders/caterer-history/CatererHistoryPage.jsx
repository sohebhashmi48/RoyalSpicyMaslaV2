import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CatererPaymentCollectionDialog from '../../../components/caterer-orders/CatererPaymentCollectionDialog';
import CatererHistoryHeader from '../../../components/caterer-orders/caterer-history/CatererHistoryHeader';
import CatererHistoryStats from '../../../components/caterer-orders/caterer-history/CatererHistoryStats';
import CatererHistoryTabs from '../../../components/caterer-orders/caterer-history/CatererHistoryTabs';
import CatererHistoryFilters from '../../../components/caterer-orders/caterer-history/CatererHistoryFilters';
import CatererHistoryBills from '../../../components/caterer-orders/caterer-history/CatererHistoryBills';
import CatererHistoryPagination from '../../../components/caterer-orders/caterer-history/CatererHistoryPagination';
import {
  FileText,
  AlertCircle,
  Receipt,
  CheckCircle
} from 'lucide-react';

function CatererHistoryPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBills, setExpandedBills] = useState(new Set());

  // Payment dialog state
  const [paymentDialog, setPaymentDialog] = useState({
    isOpen: false,
    selectedBill: null,
    selectedCaterer: null
  });
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Filter states
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'this_week', 'this_month', 'last_15_days', '6_months'
  const [selectedDate, setSelectedDate] = useState(''); // For specific date selection

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBills, setTotalBills] = useState(0);

  // Fetch caterer history and stats
  useEffect(() => {
    fetchCatererHistory();
    fetchCatererStats();
  }, [activeTab, searchQuery, minAmount, maxAmount, dateFilter, selectedDate, currentPage]);

  const fetchCatererHistory = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        status: activeTab,
        page: currentPage.toString(),
        limit: '20'
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (minAmount.trim()) {
        params.append('min_amount', minAmount.trim());
      }
      if (maxAmount.trim()) {
        params.append('max_amount', maxAmount.trim());
      }
      if (selectedDate) {
        params.append('selected_date', selectedDate);
      } else if (dateFilter && dateFilter !== 'all') {
        params.append('date_filter', dateFilter);
      }

      const response = await fetch(`http://localhost:5000/api/caterer-orders/history?${params}`);
      const result = await response.json();

      if (result.success) {
        setBills(result.data);
        setTotalPages(result.pagination?.pages || 1);
        setTotalBills(result.pagination?.total || 0);
      } else {
        setError('Failed to fetch caterer history');
      }
    } catch (error) {
      console.error('Error fetching caterer history:', error);
      setError('Failed to fetch caterer history');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatererStats = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDate) {
        params.append('selected_date', selectedDate);
      } else if (dateFilter && dateFilter !== 'all') {
        params.append('date_filter', dateFilter);
      }

      const response = await fetch(`http://localhost:5000/api/caterer-orders/history/stats?${params}`);
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching caterer stats:', error);
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'all', label: 'All Bills', icon: FileText, count: stats?.total_bills || 0 },
    { id: 'pending', label: 'Pending', icon: AlertCircle, count: stats?.pending_bills || 0 },
    { id: 'partial', label: 'Partial', icon: Receipt, count: stats?.partial_bills || 0 },
    { id: 'paid', label: 'Paid', icon: CheckCircle, count: stats?.paid_bills || 0 }
  ];

  // Format currency
  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '₹0.00';
    return `₹${numAmount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get date range based on filter
  const getDateRange = (filterType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterType) {
      case 'this_week':
        const startOfWeek = new Date(today);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        return { start: startOfWeek, end: today };
      
      case 'this_month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: startOfMonth, end: today };
      
      case 'last_15_days':
        const startOf15Days = new Date(today);
        startOf15Days.setDate(today.getDate() - 14);
        return { start: startOf15Days, end: today };
      
      case '6_months':
        const startOf6Months = new Date(today);
        startOf6Months.setMonth(today.getMonth() - 5);
        return { start: startOf6Months, end: today };
      
      default:
        return { start: null, end: null };
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    if (filterType === 'minAmount') {
      setMinAmount(value);
    } else if (filterType === 'maxAmount') {
      setMaxAmount(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle date filter changes
  const handleDateFilterChange = (filterType, value) => {
    if (filterType === 'dateFilter') {
      setDateFilter(value);
      // When using a preset range, clear specific date to avoid conflicts
      if (value !== 'all') {
        setSelectedDate('');
      }
    } else if (filterType === 'selectedDate') {
      setSelectedDate(value);
      // When selecting a specific date, ignore preset ranges
      if (value) {
        setDateFilter('all');
      }
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setMinAmount('');
    setMaxAmount('');
    setDateFilter('all');
    setSelectedDate('');
    setCurrentPage(1);
  };

  // Toggle bill expansion
  const toggleBillExpansion = (billId) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedBills(newExpanded);
  };

  // Group items by mix number for display
  const groupItemsByMix = (items) => {
    const mixGroups = {};
    const regularItems = [];

    items.forEach(item => {
      if (item.mix_number) {
        if (!mixGroups[item.mix_number]) {
          mixGroups[item.mix_number] = [];
        }
        mixGroups[item.mix_number].push(item);
      } else {
        regularItems.push(item);
      }
    });

    return { mixGroups, regularItems };
  };

  // Payment dialog functions
  const openPaymentDialog = (bill) => {
    // Create a caterer object with the required properties
    const caterer = {
      id: bill.caterer_id,
      caterer_name: bill.caterer_name,
      contact_person: bill.contact_person,
      phone: bill.caterer_phone,
      email: bill.caterer_email,
      address: bill.caterer_address
    };

    setPaymentDialog({
      isOpen: true,
      selectedBill: bill,
      selectedCaterer: caterer
    });
  };

  const closePaymentDialog = () => {
    setPaymentDialog({
      isOpen: false,
      selectedBill: null,
      selectedCaterer: null
    });
  };

  // Handle payment submission
  const handlePaymentSubmit = async (formData) => {
    try {
      setIsPaymentLoading(true);

      const response = await fetch('http://localhost:5000/api/caterer-orders/payments', {
        method: 'POST',
        body: formData // Send FormData directly for file upload
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to record payment');
      }

      // Show success message (you might want to add a toast notification here)
      console.log('Payment recorded successfully');

      // Close the dialog
      closePaymentDialog();

      // Refresh the data
      fetchCatererHistory();
      fetchCatererStats();

    } catch (error) {
      console.error('Error recording payment:', error);
      // Show error message (you might want to add a toast notification here)
      console.error(error.message || 'Failed to record payment');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <CatererHistoryHeader 
        navigate={navigate} 
        fetchCatererHistory={fetchCatererHistory} 
      />
      
      <CatererHistoryStats 
        stats={stats} 
        formatCurrency={formatCurrency} 
      />
      
      <CatererHistoryTabs 
        tabs={tabs} 
        activeTab={activeTab} 
        handleTabChange={handleTabChange} 
      />
      
      <CatererHistoryFilters
        searchQuery={searchQuery}
        handleSearch={handleSearch}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        minAmount={minAmount}
        maxAmount={maxAmount}
        dateFilter={dateFilter}
        selectedDate={selectedDate}
        handleFilterChange={handleFilterChange}
        handleDateFilterChange={handleDateFilterChange}
        clearFilters={clearFilters}
      />
      
      <div className="space-y-4">
        <CatererHistoryBills
          bills={bills}
          activeTab={activeTab}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          openPaymentDialog={openPaymentDialog}
        />
        
        <CatererHistoryPagination 
          totalPages={totalPages}
          currentPage={currentPage}
          totalBills={totalBills}
          bills={bills}
          setCurrentPage={setCurrentPage}
        />
      </div>
      
      {/* Payment Collection Dialog */}
      {paymentDialog.isOpen && paymentDialog.selectedCaterer && paymentDialog.selectedBill && (
        <CatererPaymentCollectionDialog
          isOpen={paymentDialog.isOpen}
          onClose={closePaymentDialog}
          onSubmit={handlePaymentSubmit}
          caterer={paymentDialog.selectedCaterer}
          bill={paymentDialog.selectedBill}
          isLoading={isPaymentLoading}
        />
      )}
    </div>
  );
}

export default CatererHistoryPage;

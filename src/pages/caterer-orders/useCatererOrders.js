import { useState, useEffect, useCallback } from 'react';

const useCatererOrders = (selectedDate, activeTab, searchQuery) => {
  const [catererOrders, setCatererOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    today: {
      total_orders: 0,
      total_revenue: 0,
      pending_orders: 0,
      confirmed_orders: 0,
      processing_orders: 0,
      ready_orders: 0,
      delivered_orders: 0
    }
  });

  // Fetch caterer orders
  const fetchCatererOrders = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        date_from: selectedDate,
        date_to: selectedDate
      });

      // Filter by active tab (except total and profit tabs)
      // Note: Backend handles pending status specially - shows all pending orders regardless of date
      if (activeTab !== 'total' && activeTab !== 'profit') {
        params.append('status', activeTab);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`http://localhost:5000/api/caterer-orders?${params}`);
      const result = await response.json();

      if (result.success) {
        setCatererOrders(result.data);
      } else {
        setError('Failed to fetch caterer orders');
      }
    } catch (error) {
      console.error('Error fetching caterer orders:', error);
      setError('Failed to fetch caterer orders');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeTab, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        date_from: selectedDate,
        date_to: selectedDate
      });

      const response = await fetch(`http://localhost:5000/api/caterer-orders/stats?${params}`);
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [selectedDate]);

  // Format currency
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  // Initial load and refresh when date changes
  useEffect(() => {
    fetchCatererOrders();
    fetchStats();
  }, [fetchCatererOrders, fetchStats, selectedDate]);

  return {
    catererOrders,
    loading,
    error,
    stats,
    fetchCatererOrders,
    fetchStats,
    formatCurrency
  };
};

export default useCatererOrders;
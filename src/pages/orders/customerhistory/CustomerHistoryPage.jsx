import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Users, ArrowLeft, Search, Eye, Trash2, Phone, MapPin, Calendar, IndianRupee
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

function CustomerCard({ customer, onView, onDelete }) {
  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{customer.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Phone className="h-4 w-4" />
              <span>{customer.phone}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {customer.total_orders} orders
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
          <div>
            <span className="text-gray-600">Total Sales:</span>
            <div className="font-semibold text-green-600">{formatCurrency(customer.total_amount)}</div>
          </div>
          <div>
            <span className="text-gray-600">Outstanding:</span>
            <div className="font-semibold text-red-600">{formatCurrency(customer.outstanding_balance)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Calendar className="h-4 w-4" />
          <span>Last updated: {formatDate(customer.updated_at)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <MapPin className="h-4 w-4" />
          <span className="truncate">{customer.address}</span>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => onView(customer)}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(customer)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export default function CustomerHistoryPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOutstandingOnly, setShowOutstandingOnly] = useState(false);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSales: 0,
    outstandingAmount: 0,
    receivedAmount: 0
  });

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/customers`);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data);
        setFilteredCustomers(data.data);
      } else {
        showError('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      showError('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch customer statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/stats`);
      const data = await response.json();

      if (data.success) {
        setStats({
          totalCustomers: data.data.customers.total_customers || 0,
          totalSales: data.data.customers.total_sales || 0,
          outstandingAmount: data.data.customers.total_outstanding || 0,
          receivedAmount: data.data.customers.total_collected || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, []);

  // Filter customers based on search and outstanding filter
  useEffect(() => {
    let filtered = [...customers];

    // Apply outstanding filter first
    if (showOutstandingOnly) {
      filtered = filtered.filter(customer =>
        parseFloat(customer.outstanding_balance || 0) > 0
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCustomers(filtered);
  }, [searchTerm, customers, showOutstandingOnly]);

  // Sort customers by last updated date (most recent first)
  const sortedCustomers = [...filteredCustomers].sort((a, b) =>
    new Date(b.updated_at) - new Date(a.updated_at)
  );

  const handleViewCustomer = (customer) => {
    navigate(`/orders/customer-history/${customer.id}`);
  };

  const handleDeleteCustomer = async (customer) => {
    if (window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
          method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
          setCustomers(prev => prev.filter(c => c.id !== customer.id));
          setFilteredCustomers(prev => prev.filter(c => c.id !== customer.id));
          showSuccess(data.message);
          // Refresh stats
          fetchStats();
        } else {
          showError(data.message || 'Failed to delete customer');
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        showError('Failed to delete customer');
      }
    }
  };

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/orders')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Customer History</h1>
            <p className="text-gray-600">Manage customer records and track their purchase history</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalCustomers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSales)}</div>
          </CardContent>
        </Card>
        
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            showOutstandingOnly ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-red-50'
          }`}
          onClick={() => setShowOutstandingOnly(!showOutstandingOnly)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              Outstanding Amount
              {showOutstandingOnly && (
                <Badge className="bg-red-500 text-white text-xs">
                  Filtered
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.outstandingAmount)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {(() => {
                const outstandingCount = customers.filter(customer =>
                  parseFloat(customer.outstanding_balance || 0) > 0
                ).length;
                return showOutstandingOnly
                  ? 'Click to show all customers'
                  : `${outstandingCount} customer${outstandingCount !== 1 ? 's' : ''} with outstanding • Click to filter`;
              })()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Received Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.receivedAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter Status */}
      {showOutstandingOnly && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 text-white">
                  Outstanding Filter Active
                </Badge>
                <span className="text-sm text-red-700">
                  Showing only customers with outstanding amounts
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOutstandingOnly(false)}
                className="text-red-600 border-red-200 hover:bg-red-100"
              >
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-48 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : sortedCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-500">
                {customers.length === 0
                  ? "No customers have been created yet."
                  : showOutstandingOnly
                    ? "No customers have outstanding amounts."
                    : "Try adjusting your search to see more results."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCustomers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onView={handleViewCustomer}
                onDelete={handleDeleteCustomer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

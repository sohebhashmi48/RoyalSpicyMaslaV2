import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TagIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import BillCard from '../../components/suppliers/BillCard';

const SupplierDetailPage = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [statistics, setStatistics] = useState({
    totalPurchases: 0,
    totalAmount: 0,
    amountPending: 0,
    amountPaid: 0,
    lastPurchaseDate: null
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');


  useEffect(() => {
    if (supplierId) {
      fetchSupplierData();
      fetchSupplierPurchases();
    }
  }, [supplierId]);

  useEffect(() => {
    filterPurchases();
  }, [purchases, searchTerm, selectedStatus, dateFrom, dateTo]);

  const fetchSupplierData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/suppliers');
      const data = await response.json();

      if (data.success) {
        const foundSupplier = data.suppliers.find(s => s.id === parseInt(supplierId));
        if (foundSupplier) {
          setSupplier(foundSupplier);
        } else {
          showError('Supplier not found');
          navigate('/suppliers');
        }
      } else {
        showError('Failed to fetch supplier data');
        navigate('/suppliers');
      }
    } catch (error) {
      console.error('Error fetching supplier:', error);
      showError('Failed to load supplier data');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierPurchases = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/supplier-purchases?supplier_id=${supplierId}`);
      const data = await response.json();

      if (data.success) {
        const supplierPurchases = data.data || [];
        setPurchases(supplierPurchases);
        
        // Calculate statistics
        const stats = supplierPurchases.reduce((acc, purchase) => {
          acc.totalPurchases += 1;
          acc.totalAmount += parseFloat(purchase.grand_total || 0);
          acc.amountPending += parseFloat(purchase.amount_pending || 0);
          acc.amountPaid += parseFloat(purchase.payment_amount || 0);
          
          const purchaseDate = new Date(purchase.purchase_date);
          if (!acc.lastPurchaseDate || purchaseDate > acc.lastPurchaseDate) {
            acc.lastPurchaseDate = purchaseDate;
          }
          
          return acc;
        }, {
          totalPurchases: 0,
          totalAmount: 0,
          amountPending: 0,
          amountPaid: 0,
          lastPurchaseDate: null
        });
        
        setStatistics(stats);
      } else {
        console.error('Failed to fetch purchases:', data.message);
        setPurchases([]);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      setPurchases([]);
    }
  };

  const handlePaymentUpdate = () => {
    // Refresh purchases when payment is updated
    fetchSupplierPurchases();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filterPurchases = () => {
    let filtered = [...purchases];

    // Search by bill number or supplier name
    if (searchTerm) {
      filtered = filtered.filter(purchase =>
        purchase.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(purchase => purchase.status === selectedStatus);
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(purchase => new Date(purchase.purchase_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(purchase => new Date(purchase.purchase_date) <= new Date(dateTo));
    }

    setFilteredPurchases(filtered);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading supplier details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Supplier not found</h3>
            <p className="text-gray-600 mb-4">The supplier you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/suppliers')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md"
            >
              Back to Suppliers
            </button>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/suppliers')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                {supplier.supplier_image ? (
                  <img
                    src={`http://localhost:5000/api/suppliers/supplier-images/${supplier.supplier_image}`}
                    alt={supplier.supplier_name}
                    className="h-12 w-12 rounded-full object-cover mr-4"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center mr-4 ${supplier.supplier_image ? 'hidden' : ''}`}>
                  <UserIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {supplier.supplier_name}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {supplier.contact_person && `Contact: ${supplier.contact_person}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/suppliers/${supplierId}/purchase`)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <ShoppingCartIcon className="h-4 w-4 mr-2" />
                New Purchase
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Purchases</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.totalPurchases}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center">
              <CurrencyRupeeIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Total Amount</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(statistics.totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6">
            <div className="flex items-center">
              <CurrencyRupeeIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Amount Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{formatCurrency(statistics.amountPending)}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Last Purchase</p>
                <p className="text-lg font-bold text-purple-900">{formatDate(statistics.lastPurchaseDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Supplier Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>

              <div className="flex items-center text-gray-600">
                <PhoneIcon className="h-5 w-5 mr-3" />
                <span>{supplier.phone_number || 'Not provided'}</span>
              </div>

              <div className="flex items-center text-gray-600">
                <EnvelopeIcon className="h-5 w-5 mr-3" />
                <span>{supplier.email || 'Not provided'}</span>
              </div>

              <div className="flex items-start text-gray-600">
                <MapPinIcon className="h-5 w-5 mr-3 mt-0.5" />
                <span>{supplier.address || 'Not provided'}</span>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Products Supplied</label>
                <div className="flex flex-wrap gap-2">
                  {supplier.products_supplied && supplier.products_supplied.length > 0 ? (
                    supplier.products_supplied.map((product, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {product}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No products specified</span>
                  )}
                </div>
              </div>

              {supplier.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-md">{supplier.notes}</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                <p>Added on: {formatDate(supplier.created_at)}</p>
                {supplier.updated_at !== supplier.created_at && (
                  <p>Last updated: {formatDate(supplier.updated_at)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Bills */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Purchase Bills
          </h2>

          {/* Filters */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Filter Purchase Bills</h3>
              {(searchTerm || selectedStatus || dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedStatus('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search by bill number, supplier name, or contact person"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border rounded-md px-4 py-2 flex-1 min-w-64"
              />
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="border rounded-md px-4 py-2"
              >
                <option value="">All Statuses</option>
                <option value="completed">Paid</option>
                <option value="pending">Pending</option>
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border rounded-md px-4 py-2"
                placeholder="From Date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border rounded-md px-4 py-2"
                placeholder="To Date"
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Results Summary */}
            {(searchTerm || selectedStatus || dateFrom || dateTo) && (
              <div className="text-sm text-gray-600 mb-4">
                Showing {filteredPurchases.length} of {purchases.length} purchase bills
                {(searchTerm || selectedStatus || dateFrom || dateTo) && (
                  <span className="text-gray-500">
                    {' '}(filtered)
                  </span>
                )}
              </div>
            )}
            
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {purchases.length === 0 ? 'No purchases found' : 'No purchases match your filters'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {purchases.length === 0 
                    ? 'This supplier hasn\'t made any purchases yet.'
                    : 'Try adjusting your search terms or filters to find what you\'re looking for.'
                  }
                </p>
                {purchases.length === 0 && (
                  <button
                    onClick={() => navigate(`/suppliers/${supplierId}/purchase`)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md"
                  >
                    Create First Purchase
                  </button>
                )}
              </div>
            ) : (
              filteredPurchases.map(purchase => (
                <BillCard
                  key={purchase.id}
                  bill={purchase}
                  onPaymentUpdate={handlePaymentUpdate}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailPage;

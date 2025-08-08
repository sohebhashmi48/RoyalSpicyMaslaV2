import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Star, 
  CheckCircle,
  ArrowRight,
  Users,
  Clock,
  Award,
  Search
} from 'lucide-react';

function CatererSelectionPage({ 
  cart, 
  onBackToCart, 
  onCatererSelected,
  getCartSubtotal,
  getDeliveryFee,
  getCartTotal 
}) {
  const [caterers, setCaterers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCaterer, setSelectedCaterer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Format currency
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  // Fetch caterers from API
  useEffect(() => {
    const fetchCaterers = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/caterers');
        const data = await response.json();
        
        if (data.success) {
          setCaterers(data.caterers || []);
        } else {
          setError('Failed to load caterers');
        }
      } catch (err) {
        console.error('Error fetching caterers:', err);
        setError('Failed to load caterers');
      } finally {
        setLoading(false);
      }
    };

    fetchCaterers();
  }, []);

  // Filter caterers based on search query
  const filteredCaterers = useMemo(() => {
    if (!searchQuery.trim()) return caterers;
    
    const query = searchQuery.toLowerCase().trim();
    return caterers.filter(caterer =>
      caterer.caterer_name.toLowerCase().includes(query) ||
      (caterer.contact_person && caterer.contact_person.toLowerCase().includes(query)) ||
      caterer.phone_number.includes(query) ||
      (caterer.email && caterer.email.toLowerCase().includes(query)) ||
      (caterer.address && caterer.address.toLowerCase().includes(query))
    );
  }, [caterers, searchQuery]);

  // Handle caterer selection - directly proceed to billing
  const handleCatererSelect = (caterer) => {
    onCatererSelected(caterer);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading caterers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Caterers</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onBackToCart}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white ">
        <div className="responsive-container py-4 md:py-6">
          <button
            onClick={onBackToCart}
            className="text-orange-600 hover:text-orange-700 mb-4 flex items-center gap-2 hover:scale-105 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                Select Caterer
              </h1>
              <p className="text-gray-600 mt-2">Choose a caterer to generate bill for your order</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Order Total</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(getCartTotal())}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="responsive-container py-4 md:py-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search caterers by name, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Available Caterers</h2>
              <p className="text-gray-600 text-sm">Click on a caterer to proceed directly to billing</p>
            </div>
            <div className="text-sm text-gray-500">
              {filteredCaterers.length} of {caterers.length} caterers
            </div>
          </div>
        </div>

        {filteredCaterers.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No caterers match your search' : 'No Caterers Found'}
            </h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms' : 'No caterers are available at the moment.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="responsive-grid">
            {filteredCaterers.map((caterer) => (
              <div
                key={caterer.id}
                onClick={() => handleCatererSelect(caterer)}
                className="relative bg-white rounded-lg shadow-md border border-gray-200 p-3 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-orange-300 mobile-card-compact"
              >
                <div className="flex flex-col h-full">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center flex-shrink-0 mx-auto mb-2">
                    <Building className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>

                  <div className="text-center flex-1">
                    <div className="mb-2">
                      <h3 className="text-sm md:text-base font-semibold text-gray-900 mobile-no-wrap mb-1">
                        {caterer.caterer_name}
                      </h3>
                    </div>

                    <div className="space-y-1 mobile-space-y-1">
                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span className="text-xs mobile-text-xs">{caterer.phone_number}</span>
                      </div>

                      {caterer.contact_person && (
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <Users className="h-3 w-3" />
                          <span className="text-xs mobile-text-xs mobile-no-wrap">{caterer.contact_person}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs mobile-text-xs text-center line-clamp-2">{caterer.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-green-600">
                        <Award className="h-3 w-3" />
                        <span className="text-xs mobile-text-xs font-medium">Verified</span>
                      </div>
                      <div className="flex items-center gap-1 text-orange-600">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs mobile-text-xs">Fast</span>
                      </div>
                    </div>

                    {/* {caterer.balance_due && parseFloat(caterer.balance_due) > 0 && (
                      <div className="text-xs mobile-text-xs text-orange-600 mt-1 font-medium">
                        Outstanding: {formatCurrency(parseFloat(caterer.balance_due))}
                      </div>
                    )} */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CatererSelectionPage;

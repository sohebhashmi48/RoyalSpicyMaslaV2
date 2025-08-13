import React, { useState, useEffect, useMemo } from 'react';
import { Grid, List, Package, Leaf, Coffee, ArrowRight } from 'lucide-react';
import ProductCard from '../../components/customer-online/products-card';
import Header from './Header';
import Footer from './Footer';
import './CustomerOnline.css';
import MixCalculatorModal from './mixCalculator';
import CartView from './cart';
import OrderSummary from './ordersummary';

// API functions to fetch real data
const fetchCategories = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/products/categories');
    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result)) {
        return result.map(category => ({
          ...category,
          icon: getCategoryIcon(category.name)
        }));
      }
      if (result.success && Array.isArray(result.data)) {
        return result.data.map(category => ({
          ...category,
          icon: getCategoryIcon(category.name)
        }));
      }
    }
    return [];
  } catch {
    return [];
  }
};

const fetchProducts = async (categoryId = null, searchQuery = '') => {
  try {
    let url = 'http://localhost:5000/api/products';
    const params = [];
    if (categoryId && categoryId !== 'all') params.push(`category=${encodeURIComponent(categoryId)}`);
    if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
    if (params.length) url += '?' + params.join('&');

    const response = await fetch(url);
    if (response.ok) {
      const result = await response.json();
      
      let products = [];
      if (Array.isArray(result)) {
        products = result;
      } else if (result.success && Array.isArray(result.data)) {
        products = result.data;
      }
      
      return products;
    }
    return [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

// Get category icon based on name
const getCategoryIcon = (categoryName) => {
  const name = categoryName.toLowerCase();
  if (name.includes('spice') || name.includes('masala')) return Package;
  if (name.includes('herb') || name.includes('leaf')) return Leaf;
  if (name.includes('seed') || name.includes('grain') || name.includes('powder')) return Coffee;
  if (name.includes('dry') || name.includes('fruit') || name.includes('nut')) return Package;
  return Package;
};

function CustomerOnlinePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [cart, setCart] = useState([]);
  const [currentView, setCurrentView] = useState('products');
  const [showMixCalculator, setShowMixCalculator] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(true);

  // Real data state
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  // Get cart item count
  const getCartItemCount = () => cart.length;

  // Get cart total
  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      // Use exact entered amount for custom price items
      if (item.isCustom && item.originalEnteredAmount) {
        return total + item.originalEnteredAmount;
      }
      return total + (item.price * item.quantity);
    }, 0);
  };

  // Handle search
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Better stock checking logic
  const isProductOutOfStock = (product) => {
    // Check multiple possible stock fields - prioritize available_quantity from your API
    const stockLevel = Number(
      product.available_quantity || 
      product.stock || 
      product.quantity || 
      product.inventory || 
      product.current_stock ||
      product.qty_in_stock ||
      0
    );
    
    // Check explicit out of stock flags
    const explicitOutOfStock = product.isOutOfStock === true || 
                              product.out_of_stock === true || 
                              product.status === 'out_of_stock' ||
                              product.status === 'inactive' ||
                              product.is_active === 0;
    
    return explicitOutOfStock || stockLevel <= 0;
  };

  // Use useMemo for filtered products to prevent unnecessary recalculations
  const sortedProducts = useMemo(() => {
    // Don't process if products haven't loaded yet
    if (!products || products.length === 0) {
      return [];
    }

    let filtered = [...products];

    // Apply category filter if activeCategory is not 'all'
    if (activeCategory !== 'all') {
      filtered = filtered.filter(product => {
        // product.category_id or product.categoryId or product.category_name
        if (product.category_id !== undefined) {
          return String(product.category_id) === String(activeCategory);
        }
        if (product.categoryId !== undefined) {
          return String(product.categoryId) === String(activeCategory);
        }
        if (product.category_name !== undefined) {
          return product.category_name.toLowerCase() === String(activeCategory).toLowerCase();
        }
        return true;
      });
    }

    // Apply stock filter ONLY if showOutOfStock is false
    if (!showOutOfStock) {
      filtered = filtered.filter(product => !isProductOutOfStock(product));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query)) ||
        (product.category_name && product.category_name.toLowerCase().includes(query)) ||
        (product.categoryName && product.categoryName.toLowerCase().includes(query))
      );
    }

    // Sort products - ALWAYS prioritize in-stock items first, out-of-stock items last
    filtered.sort((a, b) => {
      // First priority: Stock status (available products first, out-of-stock last)
      const aOutOfStock = isProductOutOfStock(a);
      const bOutOfStock = isProductOutOfStock(b);

      // If stock status is different, prioritize in-stock items
      if (aOutOfStock !== bOutOfStock) {
        return aOutOfStock ? 1 : -1; // In-stock (false) comes first, out-of-stock (true) comes last
      }

      // Second priority: Apply the selected sorting criteria within same stock status
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'price') {
        const priceA = Number(a.retail_price || a.retailPrice || a.price || 0);
        const priceB = Number(b.retail_price || b.retailPrice || b.price || 0);
        return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      }

      // Default: maintain original order if no other criteria apply
      return 0;
    });

    return filtered;
  }, [products, showOutOfStock, searchQuery, sortBy, sortOrder, activeCategory]);

  // Load data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setCategoriesLoading(true);
      setLoading(true);
      setError(null);
      try {
        const categoriesData = await fetchCategories();
        const allCategoriesData = [
          { id: 'all', name: 'All Products', icon: Grid },
          ...categoriesData
        ];
        setCategories(allCategoriesData);
        setCategoriesLoading(false);
        
        const productsData = await fetchProducts();
        setProducts(productsData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        setCategoriesLoading(false);
        setLoading(false);
        console.error('Error loading initial data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Load products when category or search changes
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        let categoryId = activeCategory === 'all' ? null : activeCategory;
        // Convert categoryId to number if possible for API compatibility
        if (categoryId !== null) {
          const numCategoryId = Number(categoryId);
          if (!isNaN(numCategoryId)) {
            categoryId = numCategoryId;
          }
        }
        const productsData = await fetchProducts(categoryId, searchQuery);
        setProducts(productsData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load products. Please try again later.');
        setLoading(false);
        console.error('Error loading products:', err);
      }
    };

    // Remove delay to prevent re-rendering appearance
    loadProducts();
  }, [activeCategory, searchQuery]);

  // Handle category change
  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
  };

  // Helper function to get image URL for cart item
  const getImageUrlForCartItem = (product) => {
    if (Array.isArray(product.product_images) && product.product_images.length) {
      const imagePath = product.product_images[0];
      if (!imagePath || typeof imagePath !== 'string' || !imagePath.trim()) {
        return 'https://placehold.co/300x300/f3f4f6/9ca3af?text=No+Image';
      }
      if (imagePath.startsWith('http')) return imagePath;
      if (imagePath.startsWith('/')) return `http://localhost:5000${imagePath}`;
      return `http://localhost:5000/${imagePath}`;
    }
    if (product.image) {
      if (!product.image.trim()) return 'https://placehold.co/300x300/f3f4f6/9ca3af?text=No+Image';
      if (product.image.startsWith('http')) return product.image;
      if (product.image.startsWith('/')) return `http://localhost:5000${product.image}`;
      return `http://localhost:5000/${product.image}`;
    }
    return 'https://placehold.co/300x300/f3f4f6/9ca3af?text=No+Image';
  };

  // Handle add to cart
  const handleAddToCart = (product) => {
    console.log('🔥 [CUSTOMER ONLINE DEBUG] Adding to cart:', {
      product: {
        id: product.id,
        name: product.name,
        isCustom: product.isCustom,
        isMix: product.isMix,
        price: product.price,
        quantity: product.quantity,
        unit: product.unit,
        custom_details: product.custom_details,
        mixDetails: product.mixDetails,
        mixItems: product.mixItems,
        totalWeight: product.totalWeight,
        mixNumber: product.mixNumber
      }
    });

    setCart(prevCart => {
      if (product.isCustom || product.isMix) {
        // For custom orders and mix items, always add as new item (don't combine)
        const newCartItem = {
          ...product,
          id: product.id,
          quantity: product.quantity,
          price: product.price,
          isCustom: product.isCustom || false,
          isMix: product.isMix || false,
          image: getImageUrlForCartItem(product)
        };
        
        console.log('🔥 [CUSTOMER ONLINE DEBUG] Adding custom/mix item:', newCartItem);
        return [...prevCart, newCartItem];
      } else {
        // For standard orders, check if item already exists
        const existing = prevCart.find(item => item.id === product.id && !item.isCustom && !item.isMix);
        if (existing) {
          // Update existing standard item
          const updatedCart = prevCart.map(item =>
            item.id === product.id && !item.isCustom && !item.isMix
              ? { ...item, quantity: item.quantity + (product.quantity || 1) }
              : item
          );
          console.log('🔥 [CUSTOMER ONLINE DEBUG] Updated existing standard item');
          return updatedCart;
        } else {
          // Add new standard item
          const newCartItem = {
            ...product,
            quantity: product.quantity || 1,
            isCustom: false,
            isMix: false,
            image: getImageUrlForCartItem(product)
          };
          console.log('🔥 [CUSTOMER ONLINE DEBUG] Added new standard item:', newCartItem);
          return [...prevCart, newCartItem];
        }
      }
    });
  };

  // Handle quantity change with proper decimal support
  const handleQuantityChange = (cartItemId, newQty) => {
    setCart(prevCart => {
      if (newQty <= 0) {
        // Remove item if quantity is 0 or less
        return prevCart.filter(item => item.id !== cartItemId);
      } else {
        // Update quantity, ensuring proper decimal handling
        const roundedQty = Math.max(0.1, parseFloat(newQty.toFixed(3)));
        return prevCart.map(item =>
          item.id === cartItemId
            ? { ...item, quantity: roundedQty }
            : item
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 page-transition">
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4 text-center error-shake">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Header Component */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onShowMixCalculator={() => setShowMixCalculator(true)}
        onShowCart={() => setCurrentView('cart')}
        cartItemCount={getCartItemCount()}
      />

      {/* Main Content */}
      {currentView === 'products' && (
        <>
          {/* Categories */}
          <section className="bg-white">
            <div className="container mx-auto px-4 py-6">
              {/* Desktop categories */}
              <div className="hidden md:grid grid-cols-4 lg:grid-cols-8 gap-3">
                {categories.map((category, index) => {
                  const IconComponent = category.icon;
                  const isActive = activeCategory === category.id;

                  return (
                  <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg select-none ${isActive
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-orange-50 hover:border-orange-200 border border-gray-200'
                        }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="font-medium text-sm">{category.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile categories */}
              <div className="md:hidden">
                <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                  {categories.map((category, index) => {
                    const IconComponent = category.icon;
                    const isActive = activeCategory === category.id;

                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id)}
                        className={`flex flex-col items-center gap-2 p-2 rounded-lg min-w-[70px] select-none ${isActive
                          ? 'bg-orange-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-orange-50'
                          }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="text-xs font-medium whitespace-nowrap">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Products Section */}
          <section className="py-8">
            <div className="container mx-auto px-4">
              {/* Section header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {activeCategory === 'all' ? 'All Available Products' :
                    categories.find(c => c.id === activeCategory)?.name || 'Products'}
                </h2>
                <p className="text-gray-600">
                  Browse our complete collection of premium spices and masalas for caterers
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    Showing {sortedProducts.length} of {products.length} products
                  </p>

                  {/* Stock Filter Toggle */}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showOutOfStock}
                      onChange={(e) => setShowOutOfStock(e.target.checked)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    Show out of stock items
                  </label>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Sort controls */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="price">Sort by Price</option>
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="asc">{sortBy === 'price' ? 'Low to High' : 'A-Z'}</option>
                    <option value="desc">{sortBy === 'price' ? 'High to Low' : 'Z-A'}</option>
                  </select>

                  {/* View mode */}
                  <div className="hidden sm:flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Products grid */}
              {loading ? (
                <div className={`grid gap-4 ${viewMode === 'grid'
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                  : 'grid-cols-1'
                  }`}>
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="skeleton-loading rounded-lg h-80"></div>
                  ))}
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? `No products match "${searchQuery}"` : 
                     !showOutOfStock ? 'No products in stock (try enabling "Show out of stock items")' : 
                     products.length === 0 ? 'Products are still loading...' :
                     'Try adjusting your search or category filter'}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                  {!showOutOfStock && (
                    <button
                      onClick={() => setShowOutOfStock(true)}
                      className="mt-2 ml-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Show All Products
                    </button>
                  )}
                </div>
              ) : (
                <div className={`grid gap-4 ${viewMode === 'grid'
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                  : 'grid-cols-1'
                  }`}>
                  {sortedProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      cartItem={cart.find(item => item.id === product.id && !item.isCustom && !item.isMix)}
                      onQuantityChange={handleQuantityChange}
                      viewMode={viewMode}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Call to Action */}
          <section className="relative overflow-hidden text-white py-12 md:py-16 bg-gradient-to-r from-orange-800 via-orange-600 to-orange-700">
            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 drop-shadow-lg fade-in">
                Ready to Order?
              </h2>
              <p className="text-base md:text-xl mb-6 md:mb-8 text-orange-100 drop-shadow-md px-4 slide-in-bottom">
                Place your order via WhatsApp for quick and easy delivery
              </p>
              <button
                onClick={() => setCurrentView('checkout')}
                disabled={cart.length === 0}
                className="btn-shimmer px-8 py-4 bg-white text-orange-600 rounded-lg hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl text-sm md:text-base font-semibold flex items-center gap-2 mx-auto magnetic-hover success-bounce disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                {cart.length === 0 ? 'Add items to cart first' : 'Proceed to Checkout'}
              </button>
            </div>
          </section>
        </>
      )}

      {/* Cart View */}
      {currentView === 'cart' && (
        <CartView
          cart={cart}
          onQuantityChange={handleQuantityChange}
          onBackToProducts={() => setCurrentView('products')}
          onProceedToCheckout={() => setCurrentView('checkout')}
          onClearCart={() => setCart([])}
        />
      )}

      {/* Order Summary View */}
      {currentView === 'checkout' && (
        <OrderSummary
          cart={cart}
          onBackToCart={() => setCurrentView('cart')}
          onOrderComplete={() => {
            setCart([]);
            setCurrentView('products');
          }}
        />
      )}

      {/* Mix Calculator Modal - FIXED */}
      {showMixCalculator && (
        <MixCalculatorModal 
          products={products}
          onClose={() => setShowMixCalculator(false)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Footer Component */}
      <Footer
        categories={categories}
        onCategoryChange={handleCategoryChange}
        onShowMixCalculator={() => setShowMixCalculator(true)}
        onSetCurrentView={setCurrentView}
      />
    </div>
  );
}


export default CustomerOnlinePage;














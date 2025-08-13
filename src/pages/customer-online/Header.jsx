import React from 'react';
import { Search, ShoppingCart, Calculator, Phone, Mail, MapPin } from 'lucide-react';

function Header({ 
  searchQuery, 
  onSearchChange, 
  onShowMixCalculator, 
  onShowCart, 
  cartItemCount 
}) {
  return (
    <header className="bg-white shadow-xl sticky top-0 z-50">
      {/* Top bar with contact info */}
      <div className="bg-orange-50 shadow-md">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
            <div className="flex flex-wrap items-center gap-4 mb-2 sm:mb-0 slide-in-bottom">
              <div className="flex items-center gap-1 hover-lift transition-all duration-300">
                <Phone className="h-3 w-3 text-orange-600" />
                <span>+91 97027 13157</span>
              </div>
              <div className="flex items-center gap-1 hover-lift transition-all duration-300">
                <Mail className="h-3 w-3 text-orange-600" />
                <span>royalspicymasala786@gmail.com</span>
              </div>
              <div className="flex items-center gap-1 hover-lift transition-all duration-300">
                <MapPin className="h-3 w-3 text-orange-600" />
                <span>Mumbai, Maharashtra</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-orange-600 font-medium float-animation">
              <span>🚚 Free Delivery on Orders Above ₹500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Logo and title */}
          <div className="flex items-center gap-3 fade-in">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-orange-800 rounded-full flex items-center justify-center text-white font-bold text-lg hover-lift glow-effect">
              RM
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold gradient-text">
                RoyalSpicyMasala
              </h1>
              <p className="text-sm text-gray-600">Customer Portal - Premium Spices & Masalas</p>
            </div>
          </div>

          {/* Search and actions */}
          <div className="flex items-center gap-3 slide-in-bottom">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search spices, masalas..."
                value={searchQuery}
                onChange={onSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover-lift"
              />
            </div>

            {/* Mix Calculator */}
            <button
              onClick={onShowMixCalculator}
              className="btn-shimmer px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 transition-all duration-300 flex items-center gap-2 font-medium magnetic-hover"
            >
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Mix Calculator</span>
            </button>

            {/* Cart */}
            <button
              onClick={onShowCart}
              className="relative px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-300 flex items-center gap-2 hover-lift"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="cart-badge-pulse absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

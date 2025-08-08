import React from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

function Footer({ 
  categories, 
  onCategoryChange, 
  onShowMixCalculator, 
  onSetCurrentView 
}) {
  return (
    <footer className="bg-stone-800 text-white py-12 mt-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-800 rounded-full flex items-center justify-center text-white font-bold hover-lift glow-effect">
                RM
              </div>
              <div>
                <h3 className="text-xl font-bold gradient-text">RoyalSpicyMasala</h3>
                <p className="text-gray-400 text-sm">Premium Spices & Masalas</p>
              </div>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">
              We are dedicated to providing the finest quality spices and masalas to caterers and food businesses.
              Our products are sourced directly from farmers and processed with utmost care to maintain their authentic flavors.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 hover-lift transition-all duration-300">
                <Phone className="h-4 w-4 text-orange-500" />
                <span>+91 97027 13157</span>
              </div>
              <div className="flex items-center gap-2 hover-lift transition-all duration-300">
                <Mail className="h-4 w-4 text-orange-500" />
                <span>royalspicymasala786@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 hover-lift transition-all duration-300">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span>Mumbai, Maharashtra, India</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="slide-in-bottom">
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => onSetCurrentView('products')} 
                  className="text-gray-300 hover:text-orange-500 transition-colors hover-lift"
                >
                  All Products
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onSetCurrentView('cart')} 
                  className="text-gray-300 hover:text-orange-500 transition-colors hover-lift"
                >
                  Shopping Cart
                </button>
              </li>
              <li>
                <button 
                  onClick={onShowMixCalculator} 
                  className="text-gray-300 hover:text-orange-500 transition-colors hover-lift"
                >
                  Mix Calculator
                </button>
              </li>
              <li>
                <span className="text-gray-300 hover:text-orange-500 transition-colors cursor-pointer hover-lift">
                  Track Order
                </span>
              </li>
              <li>
                <span className="text-gray-300 hover:text-orange-500 transition-colors cursor-pointer hover-lift">
                  Bulk Orders
                </span>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="slide-in-bottom" style={{ animationDelay: '0.2s' }}>
            <h4 className="text-lg font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              {categories.slice(1, 6).map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => {
                      onCategoryChange(category.id);
                      onSetCurrentView('products');
                    }}
                    className="text-gray-300 hover:text-orange-500 transition-colors hover-lift"
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 RoyalSpicyMasala. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span className="text-gray-400 text-sm">Follow us:</span>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-orange-600 transition-all duration-300 cursor-pointer hover-lift magnetic-hover">
                  <Facebook className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-orange-600 transition-all duration-300 cursor-pointer hover-lift magnetic-hover">
                  <Instagram className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-orange-600 transition-all duration-300 cursor-pointer hover-lift magnetic-hover">
                  <Twitter className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

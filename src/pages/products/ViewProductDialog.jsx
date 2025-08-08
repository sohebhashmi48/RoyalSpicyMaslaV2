import React from 'react';

const ViewProductDialog = ({ product, categories, onClose }) => {
  if (!product) return null;

  // Helper function to safely parse product images
  const getProductImages = (product) => {
    try {
      if (!product.product_images) return [];
      if (typeof product.product_images === 'string') {
        // Handle malformed JSON strings
        const cleanedString = product.product_images.trim();
        if (cleanedString.startsWith('[') && cleanedString.endsWith(']')) {
          return JSON.parse(cleanedString);
        } else if (cleanedString.startsWith('/api/')) {
          // Single image URL as string
          return [cleanedString];
        }
        return [];
      }
      return Array.isArray(product.product_images) ? product.product_images : [];
    } catch (error) {
      console.error('Error parsing product images:', error);
      console.error('Product images value:', product.product_images);
      return [];
    }
  };

  // Get category name
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const images = getProductImages(product);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Product Header */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Category: {getCategoryName(product.category_id)}</span>
              {product.sub_category && (
                <span className="text-sm text-gray-600">Sub Category: {product.sub_category}</span>
              )}
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                product.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Unit</div>
            <div className="text-lg font-semibold text-gray-900">{product.unit}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Images */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Images</h3>
            {images.length > 0 ? (
              <div className="space-y-4">
                {/* Main Image */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={`http://localhost:5000${images[0]}`}
                    alt={`${product.name} - Main Image`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEwNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOUNBM0FGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4K';
                    }}
                  />
                </div>
                {/* Thumbnail Images */}
                {images.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {images.slice(1).map((imageUrl, index) => (
                      <div key={index + 1} className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={`http://localhost:5000${imageUrl}`}
                          alt={`${product.name} - Image ${index + 2}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEwNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOUNBM0FGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4K';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No images available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-600 mb-1">Market Price</div>
                <div className="text-2xl font-bold text-blue-900">
                  {product.market_price ? `₹${product.market_price}` : 'Not set'}
                </div>
                <div className="text-xs text-blue-600">per {product.unit}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm font-medium text-green-600 mb-1">Retail Price</div>
                <div className="text-2xl font-bold text-green-900">
                  {product.retail_price ? `₹${product.retail_price}` : 'Not set'}
                </div>
                <div className="text-xs text-green-600">per {product.unit}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm font-medium text-orange-600 mb-1">Caterer Price</div>
                <div className="text-2xl font-bold text-orange-900">
                  {product.caterer_price ? `₹${product.caterer_price}` : 'Not set'}
                </div>
                <div className="text-xs text-orange-600">per {product.unit}</div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                <p className="text-gray-900 font-medium">{product.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <p className="text-gray-900">{getCategoryName(product.category_id)}</p>
              </div>
              {product.sub_category && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sub Category</label>
                  <p className="text-gray-900">{product.sub_category}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit of Measurement</label>
                <p className="text-gray-900">{product.unit}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </div>
            </div>
          )}

          {/* Product Metadata */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Created Date</label>
                <p className="text-gray-900">
                  {product.created_at ? new Date(product.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Updated</label>
                <p className="text-gray-900">
                  {product.updated_at ? new Date(product.updated_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProductDialog;

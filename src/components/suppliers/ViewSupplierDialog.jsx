import { useEffect } from 'react';
import { 
  XMarkIcon, 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TagIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const ViewSupplierDialog = ({ isOpen, onClose, supplier, onEdit }) => {
  // Disable body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 transition-opacity" 
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.4)', 
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      ></div>
      
      {/* Dialog container */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Dialog content */}
        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10" 
          style={{ maxHeight: '90vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserIcon className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Supplier Details</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={onEdit}
                  className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-md transition-colors"
                  title="Edit Supplier"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="space-y-6">
              {/* Supplier Image and Basic Info */}
              <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                {/* Image */}
                <div className="flex-shrink-0">
                  {supplier.supplier_image ? (
                    <img
                      src={`http://localhost:5000/uploads/suppliers/${supplier.supplier_image}`}
                      alt={supplier.supplier_name}
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg border border-gray-200 flex items-center justify-center">
                      <UserIcon className="h-12 w-12 text-orange-400" />
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{supplier.supplier_name}</h2>
                    <p className="text-lg text-gray-600">{supplier.contact_person}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone */}
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">{supplier.phone_number}</p>
                      </div>
                    </div>

                    {/* Email */}
                    {supplier.email && (
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email</p>
                          <p className="text-sm text-gray-600">{supplier.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              {supplier.address && (
                <div>
                  <div className="flex items-start">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Address</p>
                      <p className="text-sm text-gray-600">{supplier.address}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Products Supplied */}
              {supplier.products_supplied && supplier.products_supplied.length > 0 && (
                <div>
                  <div className="flex items-start">
                    <TagIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">Products Supplied</p>
                      <div className="flex flex-wrap gap-2">
                        {supplier.products_supplied.map((product, index) => (
                          <span
                            key={index}
                            className="inline-block px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded-full"
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {supplier.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{supplier.notes}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(supplier.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {supplier.updated_at && supplier.updated_at !== supplier.created_at && (
                    <div>
                      <span className="font-medium">Updated:</span>{' '}
                      {new Date(supplier.updated_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm"
            >
              Edit Supplier
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewSupplierDialog;

import React from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  MapPin,
  Calendar,
  Truck
} from 'lucide-react';

// Utility functions
const formatCurrency = (amount) => {
  const numAmount = Number(amount) || 0;
  const formatted = numAmount.toFixed(2);
  if (String(amount).includes('₹')) {
    return String(amount);
  }
  return `₹${formatted}`;
};

const formatDate = (dateStr) => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

// Status configuration for caterer orders
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-4 w-4" />,
    actionButton: { text: 'Confirm', action: 'confirmed', color: 'bg-green-600 hover:bg-green-700' }
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-700',
    icon: <CheckCircle className="h-4 w-4" />,
    actionButton: { text: 'Process', action: 'processing', color: 'bg-purple-600 hover:bg-purple-700' }
  },
  processing: {
    label: 'Processing',
    color: 'bg-purple-100 text-purple-700',
    icon: <Package className="h-4 w-4" />,
    actionButton: { text: 'Ready', action: 'ready', color: 'bg-orange-600 hover:bg-orange-700' }
  },
  ready: {
    label: 'Ready',
    color: 'bg-orange-100 text-orange-700',
    icon: <Truck className="h-4 w-4" />,
    actionButton: { text: 'Deliver', action: 'delivered', color: 'bg-green-600 hover:bg-green-700' }
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-4 w-4" />
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-4 w-4" />
  }
};

const SOURCE_CONFIG = {
  'caterer-online': { label: 'Caterer Online', color: 'bg-green-100 text-green-700' },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
  phone: { label: 'Phone', color: 'bg-purple-100 text-purple-700' },
  all: { label: 'All Sources', color: 'bg-gray-100 text-gray-700' }
};

function CatererOrderCard({ order, onViewOrder, onOrderAction }) {
  const statusConfig = STATUS_CONFIG[order.status];
  const sourceConfig = SOURCE_CONFIG[order.order_source] || SOURCE_CONFIG.all;

  return (
    <div className="shadow-lg rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-2">
          <h3 className="text-lg font-semibold truncate">#{order.order_number}</h3>
          <Badge className={`flex items-center gap-1 ${statusConfig.color}`}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </Badge>
          <Badge variant="outline" className={sourceConfig.color}>
            {sourceConfig.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 text-sm text-gray-600 gap-2">
          <div className="flex items-center gap-2 truncate">
            <Phone className="h-4 w-4" />
            <span>{order.caterer_name} - {order.caterer_phone}</span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4" />
            <span>{order.caterer_address || 'No address provided'}</span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(order.created_at)}</span>
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-2 items-center">
          <span className="font-medium">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
          <span className="mx-2">&bull;</span>
          <span className="font-medium">Revenue: {formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        {statusConfig.actionButton && (
          <Button
            size="sm"
            className={`${statusConfig.actionButton.color} text-white`}
            onClick={() => onOrderAction(order, statusConfig.actionButton.action)}
          >
            {statusConfig.icon}
            <span className="ml-1">{statusConfig.actionButton.text}</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onViewOrder(order)}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
}

export default CatererOrderCard;

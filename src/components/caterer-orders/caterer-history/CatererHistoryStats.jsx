import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const CatererHistoryStats = ({ stats, formatCurrency }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.total_revenue)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.total_bills} bills • {stats.unique_caterers} caterers
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.total_paid)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.paid_bills} paid bills
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Pending Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(stats.total_pending)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.bills_with_pending_amount} bills pending
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Overdue Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {stats.overdue_bills}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Require immediate attention
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CatererHistoryStats;

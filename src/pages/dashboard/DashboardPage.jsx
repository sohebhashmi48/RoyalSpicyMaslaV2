import React from 'react';
import { 
  CubeIcon, 
  SparklesIcon, 
  GiftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  // Mock data - replace with real data from API
  const stats = [
    {
      name: 'Total Masala Items',
      value: '24',
      change: '+12%',
      changeType: 'increase',
      icon: SparklesIcon,
      color: 'bg-orange-500'
    },
    {
      name: 'Total Spices',
      value: '18',
      change: '+8%',
      changeType: 'increase',
      icon: CubeIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Dry Fruits Stock',
      value: '32',
      change: '-3%',
      changeType: 'decrease',
      icon: GiftIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Low Stock Items',
      value: '5',
      change: '+2',
      changeType: 'warning',
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500'
    }
  ];

  const recentTransactions = [
    { id: 1, product: 'Garam Masala', type: 'Sale', quantity: '2 kg', amount: '₹400', time: '2 hours ago' },
    { id: 2, product: 'Almonds', type: 'Purchase', quantity: '5 kg', amount: '₹2500', time: '4 hours ago' },
    { id: 3, product: 'Turmeric Powder', type: 'Sale', quantity: '1 kg', amount: '₹180', time: '6 hours ago' },
    { id: 4, product: 'Cashews', type: 'Sale', quantity: '500g', amount: '₹350', time: '8 hours ago' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Page Header */}
      <div className="card">
        <div className="dashboard-header">
          <div>
            <h1 className="responsive-text-2xl font-bold text-gray-900 mb-2">
              Business Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back! Here's your business overview for today.
            </p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Live Data • Last updated: 7:44:06 pm
            </div>
          </div>
          <button className="bg-blue-600 text-white btn-responsive rounded-lg font-medium hover:bg-blue-700 transition-colors">
            + Quick Add
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {stat.changeType === 'increase' && (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                )}
                {stat.changeType === 'decrease' && (
                  <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 
                  stat.changeType === 'decrease' ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="dashboard-header mb-4">
          <h2 className="responsive-text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <button className="text-blue-600 hover:text-blue-700 responsive-text-sm font-medium">
            View all
          </button>
        </div>
        <div className="table-responsive">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Type
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="truncate max-w-32 sm:max-w-none">{transaction.product}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.type === 'Sale'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">
                    {transaction.quantity}
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                    {transaction.amount}
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {transaction.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

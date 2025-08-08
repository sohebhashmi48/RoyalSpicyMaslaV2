import React from 'react';
import {
  FileText,
  Clock,
  AlertCircle,
  Receipt,
  CheckCircle,
  XCircle
} from 'lucide-react';

const CatererHistoryTabs = ({ tabs, activeTab, handleTabChange }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            <span className={`px-2 py-1 rounded-full text-xs ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CatererHistoryTabs;

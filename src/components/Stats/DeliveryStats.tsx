import React from 'react';
import { DeliveryStats as DeliveryStatsType } from '../../types';
import { Package, TrendingUp, ShoppingBag, Users } from 'lucide-react';

interface DeliveryStatsProps {
  stats: DeliveryStatsType;
}

const DeliveryStats: React.FC<DeliveryStatsProps> = ({ stats }) => {
  return (
    <div className="bg-white shadow-card rounded-lg p-3 h-full overflow-auto">
      <h2 className="text-lg font-medium text-neutral-800 mb-3 sticky top-0 z-10 bg-white pb-2 border-b">Статистика поставок</h2>
      
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-neutral-50 rounded-lg p-3 flex items-center">
          <div className="bg-ozon bg-opacity-10 p-2 rounded-full mr-3">
            <TrendingUp className="w-5 h-5 text-ozon" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Всего поставок</p>
            <p className="text-xl font-semibold">{stats.totalDeliveries}</p>
          </div>
        </div>
        
        <div className="bg-neutral-50 rounded-lg p-3 flex items-center">
          <div className="bg-wildberries bg-opacity-10 p-2 rounded-full mr-3">
            <Package className="w-5 h-5 text-wildberries" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Всего товаров</p>
            <p className="text-xl font-semibold">{stats.totalItems}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-3 mt-3">
        <div className="bg-neutral-50 rounded-lg p-3">
          <div className="flex items-center mb-2">
            <div className="bg-yandex bg-opacity-10 p-2 rounded-full mr-3">
              <ShoppingBag className="w-5 h-5 text-neutral-800" />
            </div>
            <p className="text-sm text-neutral-500">По маркетплейсам</p>
          </div>
          
          <div className="space-y-1">
            {Object.entries(stats.marketplaceBreakdown).map(([marketplace, count]) => (
              <div key={marketplace} className="flex justify-between items-center">
                <span className="text-sm font-medium">{marketplace}</span>
                <span className="text-sm bg-neutral-200 px-2 py-0.5 rounded-full">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-neutral-50 rounded-lg p-3">
          <div className="flex items-center mb-2">
            <div className="bg-ozon bg-opacity-10 p-2 rounded-full mr-3">
              <Users className="w-5 h-5 text-neutral-800" />
            </div>
            <p className="text-sm text-neutral-500">По подразделениям</p>
          </div>
          
          <div className="space-y-1">
            {Object.entries(stats.departmentBreakdown).map(([department, count]) => (
              <div key={department} className="flex justify-between items-center">
                <span className="text-sm font-medium">{department}</span>
                <span className="text-sm bg-neutral-200 px-2 py-0.5 rounded-full">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryStats;
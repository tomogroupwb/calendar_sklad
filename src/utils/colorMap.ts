import { Marketplace } from '../types';

export const getMarketplaceColor = (marketplace: Marketplace): string => {
  const marketplaceLower = marketplace.toLowerCase();
  
  switch (marketplaceLower) {
    case 'ozon':
      return '#0051E7';
    case 'wildberries':
      return '#CB11AB';
    case 'яндекс.маркет':
      return '#FFCC00';
    default:
      return '#6B7280';
  }
};

export const getDepartmentColor = (department: string): string => {
  if (!department) return '#000000'; // Черный по умолчанию
  
  const deptUpper = department.toUpperCase();
  
  if (deptUpper.includes('ИП ЦНМ')) return '#8A2BE2'; // Фиолетовый
  if (deptUpper.includes('ИП БАЕ')) return '#1E90FF'; // Голубой
  if (deptUpper.includes('ИП БРМ')) return '#2E8B57'; // Зеленый
  if (deptUpper.includes('ИП БЕС')) return '#FF69B4'; // Розовый
  if (deptUpper.includes('ИП БСМ')) return '#DC143C'; // Красный
  
  return '#000000'; // Черный для неизвестных подразделений
};

export const getEventClassNames = (marketplace: Marketplace): string => {
  const baseClass = 'rounded-lg p-1.5 text-sm font-semibold shadow-sm border';
  
  const marketplaceLower = marketplace.toLowerCase();
  
  switch (marketplaceLower) {
    case 'ozon':
      return `${baseClass} bg-blue-50 text-blue-950 drop-shadow-sm border-blue-300 hover:bg-blue-100 transition-colors duration-150`;
    case 'wildberries':
      return `${baseClass} bg-purple-50 text-purple-950 drop-shadow-sm border-purple-300 hover:bg-purple-100 transition-colors duration-150`;
    case 'яндекс.маркет':
      return `${baseClass} bg-yellow-50 text-neutral-900 drop-shadow-sm border-yellow-300 hover:bg-yellow-100 transition-colors duration-150`;
    default:
      return `${baseClass} bg-neutral-50 text-neutral-900 border-neutral-300 hover:bg-neutral-100 transition-colors duration-150`;
  }
};
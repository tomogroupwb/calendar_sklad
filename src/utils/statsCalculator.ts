import { DeliveryEvent, DeliveryStats } from '../types';

export const calculateDeliveryStats = (events: DeliveryEvent[]): DeliveryStats => {
  const totalDeliveries = events.length;
  let totalItems = 0;
  const marketplaceBreakdown: Record<string, number> = {};
  const departmentBreakdown: Record<string, number> = {};
  
  events.forEach(event => {
    totalItems += event.itemCount;
    
    if (marketplaceBreakdown[event.marketplace]) {
      marketplaceBreakdown[event.marketplace] += 1;
    } else {
      marketplaceBreakdown[event.marketplace] = 1;
    }
    
    if (event.department) {
      if (departmentBreakdown[event.department]) {
        departmentBreakdown[event.department] += 1;
      } else {
        departmentBreakdown[event.department] = 1;
      }
    }
  });
  
  return {
    totalDeliveries,
    totalItems,
    marketplaceBreakdown,
    departmentBreakdown,
  };
};
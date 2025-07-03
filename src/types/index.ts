export interface DeliveryEvent {
  id: string;
  title: string;
  date: string;
  marketplace: Marketplace;
  warehouse: string;
  department: string;
  itemCount: number;
  realizationNumber?: string;
  configId?: string;
  deliveryNumber?: string;
  transitWarehouse?: string;
}

export type Marketplace = 'Ozon' | 'Wildberries' | 'Яндекс.Маркет';

export interface FilterOptions {
  marketplace: string | null;
  warehouse: string | null;
  department: string[] | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CalendarViewState {
  activeView: 'dayGridMonth' | 'timeGridWeek' | 'listWeek';
}

export interface SheetsData {
  values: string[][];
}

export interface DeliveryStats {
  totalDeliveries: number;
  totalItems: number;
  marketplaceBreakdown: Record<string, number>;
  departmentBreakdown: Record<string, number>;
}

export interface GoogleSheetsConfig {
  id: string;
  name: string;
  spreadsheetId: string;
  sheetName: string;
  userId?: string;
  columnMappings: {
    dateColumn: string;
    marketplaceColumn: string;
    warehouseColumn: string;
    departmentColumn: string;
    itemCountColumn: string;
    realizationNumberColumn: string;
    deliveryNumberColumn: string;
    transitWarehouseColumn: string;
  };
}

export interface AuthState {
  isLoggedIn: boolean;
  user: FirebaseUser | GoogleUser | null;
  authProvider: 'firebase' | 'google' | null;
}

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName?: string | null;
}

export interface GoogleUser {
  id?: string;
  email?: string;
  name?: string;
  access_token: string;
  uid?: never; // Для защиты от ошибок типизации
}
import React, { useEffect, useState, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { DeliveryEvent, FilterOptions, GoogleSheetsConfig, AuthState } from './types';
import { calculateDeliveryStats } from './utils/statsCalculator';
import { 
  fetchDeliveryData, 
  fetchDeliveryDataFromMultipleConfigs,
  getAccessToken, 
  isTokenExpired, 
  clearToken,
  startAutoRefresh,
  stopAutoRefresh,
  isAutoRefreshActive
} from './utils/googleSheetsService';
import { getAllConfigs } from './utils/sheetsConfigService';
import { getAllFirebaseConfigs } from './utils/firebaseConfigService';
import DeliveryCalendar from './components/Calendar/DeliveryCalendar';
import FilterPanel from './components/Filters/FilterPanel';
import DeliveryStats from './components/Stats/DeliveryStats';
import Header from './components/Layout/Header';
import LoadingSpinner from './components/Layout/LoadingSpinner';
import AuthSelector from './components/Auth/AuthSelector';
import ConfigPage, { AuthProvider } from './components/Config/ConfigPage';
import { auth } from './utils/firebaseConfig';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<'calendar' | 'config'>('calendar');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [activeConfigIds, setActiveConfigIds] = useState<string[]>([]);
  
  // Состояние аутентификации
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    user: null,
    authProvider: null
  });
  
  // Инициализация состояния на основе существующих токенов/сессий
  useEffect(() => {
    // Проверяем наличие токена Google OAuth
    const hasGoogleToken = !!getAccessToken();
    if (hasGoogleToken && !isTokenExpired()) {
      const token = getAccessToken();
      if (token) {
        setAuthState({
          isLoggedIn: true,
          user: { access_token: token },
          authProvider: 'google'
        });
      }
    }
    
    // Добавляем слушателя состояния аутентификации Firebase
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthState({
          isLoggedIn: true,
          user: {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName
          },
          authProvider: 'firebase'
        });
      }
    });
    
    // Очистка слушателя при размонтировании
    return () => unsubscribe();
  }, []);
  
  const [filters, setFilters] = useState<FilterOptions>({
    marketplace: null,
    warehouse: null,
    department: null,
    startDate: null,
    endDate: null,
  });
  
  // Состояние для хранения конфигураций
  const [sheetsConfigs, setSheetsConfigs] = useState<GoogleSheetsConfig[]>([]);
  
  // Extract unique values for filter dropdowns
  const marketplaces = [...new Set(events.map(event => event.marketplace))];
  
  // Получаем список складов в зависимости от выбранного маркетплейса
  const warehouses = [...new Set(events
    .filter(event => !filters.marketplace || event.marketplace === filters.marketplace)
    .map(event => event.warehouse)
  )];
  
  const departments = [...new Set(events.map(event => event.department))];
  
  // Calculate stats based on filtered events
  const filteredEvents = events.filter(event => {
    if (filters.marketplace && event.marketplace !== filters.marketplace) return false;
    if (filters.warehouse && event.warehouse !== filters.warehouse) return false;
    
    // Фильтрация по подразделениям (множественный выбор)
    if (filters.department && filters.department.length > 0) {
      if (!filters.department.includes(event.department)) return false;
    }
    
    // Фильтрация по периоду дат
    if (filters.startDate || filters.endDate) {
      const eventDate = new Date(event.date);
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (eventDate < startDate) return false;
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Устанавливаем конец дня для включения всех событий выбранного дня
        if (eventDate > endDate) return false;
      }
    }
    
    return true;
  });
  
  const stats = calculateDeliveryStats(filteredEvents);
  
  // Загрузка конфигураций в зависимости от провайдера аутентификации
  useEffect(() => {
    const loadConfigs = async () => {
      if (!authState.isLoggedIn) return;
      
      try {
        let configs: GoogleSheetsConfig[] = [];
        
        if (authState.authProvider === 'google') {
          // Загружаем конфигурации из localStorage для Google аутентификации
          configs = getAllConfigs();
        } else if (authState.authProvider === 'firebase' && 
                 authState.user && 'uid' in authState.user && authState.user.uid) {
          // Загружаем конфигурации из Firebase для Firebase аутентификации
          configs = await getAllFirebaseConfigs(authState.user.uid);
        }
        
        setSheetsConfigs(configs);
      } catch (error) {
        console.error('Ошибка при загрузке конфигураций:', error);
      }
    };
    
    loadConfigs();
  }, [authState.isLoggedIn, authState.authProvider, authState.user]);
  
  // Создаем функцию обновления данных из Google Sheets
  const refreshData = useCallback(async () => {
    if (!authState.isLoggedIn) return;
    
    setIsLoading(true);
    try {
      // Используем активные конфигурации, если они есть, иначе берем все
      let data;
      if (activeConfigIds.length > 0) {
        data = await fetchDeliveryDataFromMultipleConfigs(activeConfigIds);
        console.log(`Данные обновлены из ${activeConfigIds.length} активных конфигураций:`, data);
      } else {
        data = await fetchDeliveryData();
        console.log('Данные обновлены из всех доступных конфигураций:', data);
      }
      setEvents(data);
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authState.isLoggedIn, activeConfigIds]);
  
  // Функция для загрузки данных из выбранных конфигураций
  const fetchFromConfigs = useCallback(async (configIds: string[]) => {
    if (!authState.isLoggedIn || configIds.length === 0) return;
    
    setIsLoading(true);
    try {
      const data = await fetchDeliveryDataFromMultipleConfigs(configIds);
      console.log(`Данные загружены из ${configIds.length} конфигураций:`, data);
      setEvents(data);
      
      // Сохраняем активные конфигурации
      setActiveConfigIds(configIds);
      
      // Переключаемся на страницу календаря, чтобы показать загруженные данные
      setCurrentPage('calendar');
    } catch (error) {
      console.error('Ошибка при загрузке данных из конфигураций:', error);
      throw error; // Перебрасываем ошибку для обработки в компоненте ConfigPage
    } finally {
      setIsLoading(false);
    }
  }, [authState.isLoggedIn]);
  
  // Функция для включения/отключения автообновления
  const toggleAutoRefresh = useCallback(() => {
    if (isAutoRefreshActive()) {
      stopAutoRefresh();
      setAutoRefreshEnabled(false);
      console.log('Автообновление отключено пользователем');
    } else {
      startAutoRefresh((updatedData) => {
        console.log('Получены обновленные данные:', updatedData);
        setEvents(updatedData);
      }, 60000, activeConfigIds); // Передаем активные конфигурации
      setAutoRefreshEnabled(true);
      console.log('Автообновление включено пользователем');
    }
  }, [activeConfigIds]);
  
  // Запускаем автообновление данных при успешной авторизации
  useEffect(() => {
    if (authState.isLoggedIn) {
      // Запускаем начальную загрузку
      refreshData();
      
      // По умолчанию не запускаем автообновление, пусть пользователь включит его сам
      setAutoRefreshEnabled(isAutoRefreshActive());
    } else {
      // Если пользователь не авторизован, останавливаем автообновление и сбрасываем состояние загрузки
      stopAutoRefresh();
      setAutoRefreshEnabled(false);
      setIsLoading(false);
    }
    
    // При размонтировании останавливаем автообновление
    return () => {
      stopAutoRefresh();
    };
  }, [authState.isLoggedIn, refreshData]);
  
  const handleFilterChange = (filterName: keyof FilterOptions, value: string | null) => {
    // Если изменяется маркетплейс, сбрасываем выбранный склад
    if (filterName === 'marketplace') {
      setFilters(prev => ({
        ...prev,
        [filterName]: value,
        warehouse: null, // Сбрасываем склад при изменении маркетплейса
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [filterName]: value,
      }));
    }
  };
  
  const handleEventsUpdate = (updatedEvents: DeliveryEvent[]) => {
    setEvents(updatedEvents);
  };
  
  const handleLoginSuccess = (user: any) => {
    console.log('Обработка успешного входа:', user);
    
    if (user.access_token) {
      // Успешный вход через Google
      console.log('Вход через Google OAuth, сохраняем токен...');
      setAuthState({
        isLoggedIn: true,
        user: { access_token: user.access_token },
        authProvider: 'google'
      });
    } else {
      // Проверяем, есть ли в localStorage токен Google (добавлен через Firebase)
      const accessToken = localStorage.getItem('google_access_token');
      console.log('Вход через Firebase, проверяем токен:', { 
        hasLocalToken: !!accessToken,
        tokenSubstring: accessToken ? accessToken.substring(0, 10) + '...' : 'отсутствует'
      });
      
      // Если нет токена, возможно Firebase не предоставил его
      if (!accessToken) {
        console.warn('Токен Google Sheets API не получен через Firebase, некоторые функции могут быть недоступны');
      }
      
      // Успешный вход через Firebase
      setAuthState({
        isLoggedIn: true,
        user: {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName,
          // Если есть токен в localStorage, используем его
          access_token: accessToken || undefined
        },
        authProvider: 'firebase'
      });
      
      // Проверяем срок действия токена и логируем результат
      if (accessToken) {
        const isExpired = isTokenExpired();
        console.log('Проверка срока действия токена после входа:', { isExpired });
      }
    }
  };
  
  const handleLoginFailure = (error: any) => {
    console.error('Login failed:', error);
    alert('Ошибка авторизации. Пожалуйста, попробуйте снова.');
  };
  
  const handleLogout = () => {
    // Останавливаем автообновление при выходе из системы
    stopAutoRefresh();
    setAutoRefreshEnabled(false);
    
    // Очищаем активные конфигурации
    setActiveConfigIds([]);
    
    // Сбрасываем состояние аутентификации
    if (authState.authProvider === 'google') {
      clearToken();
    }
    
    // Выход из Firebase, если использовался этот провайдер
    if (authState.authProvider === 'firebase') {
      auth.signOut();
    }
    
    // Устанавливаем состояние не аутентифицирован
    setAuthState({
      isLoggedIn: false,
      user: null,
      authProvider: null
    });
    
    // Очищаем данные событий при выходе из системы
    setEvents([]);
  };
  
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white shadow-card rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold mb-6">Configuration Error</h2>
          <p className="text-neutral-600">
            Google Client ID is not configured. Please set the VITE_GOOGLE_CLIENT_ID environment variable.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-neutral-100 flex flex-col">
        <Header 
          isLoggedIn={authState.isLoggedIn} 
          onLogout={handleLogout}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={authState.isLoggedIn ? toggleAutoRefresh : undefined}
        />
        
        <main className="max-w-[1400px] mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-8">
          {isLoading && <LoadingSpinner />}
          
          {!authState.isLoggedIn ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <AuthSelector
                onLoginSuccess={handleLoginSuccess}
                onLoginFailure={handleLoginFailure}
              />
            </div>
          ) : (
            <>
              <div className="flex justify-between mb-3 sm:mb-4">
                <div className="flex-grow">
                  <nav className="inline-flex rounded-md shadow-sm">
                    <button
                      type="button"
                      onClick={() => setCurrentPage('calendar')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
                        currentPage === 'calendar'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      } border border-neutral-300 rounded-l-md focus:outline-none`}
                    >
                      Календарь
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('config')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
                        currentPage === 'config'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      } border border-neutral-300 rounded-r-md focus:outline-none`}
                    >
                      Настройка таблиц
                    </button>
                  </nav>
                </div>
              </div>
              
              {!isLoading && (
                <>
                  {currentPage === 'calendar' ? (
                    <>
                      <div className="mb-3 sm:mb-4">
                        <FilterPanel
                          marketplaces={marketplaces}
                          warehouses={warehouses}
                          departments={departments}
                          filters={filters}
                          onFilterChange={handleFilterChange}
                        />
                      </div>
                      
                      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
                        <div className="w-full lg:w-4/5">
                          <DeliveryCalendar
                            events={filteredEvents}
                            onEventsUpdate={handleEventsUpdate}
                            filters={filters}
                          />
                        </div>
                        
                        <div className="w-full lg:w-1/5 mt-3 lg:mt-0">
                          <DeliveryStats stats={stats} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <AuthProvider value={authState}>
                      <ConfigPage
                        onLoadFromConfigs={fetchFromConfigs}
                        onBack={() => setCurrentPage('calendar')}
                      />
                    </AuthProvider>
                  )}
                </>
              )}
            </>
          )}
        </main>
        
        <footer className="bg-white border-t border-neutral-200 py-3 sm:py-4 mt-4 sm:mt-6">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <p className="text-center text-neutral-500 text-xs sm:text-sm">
              &copy; {new Date().getFullYear()} Календарь поставок на маркетплейсы
            </p>
          </div>
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
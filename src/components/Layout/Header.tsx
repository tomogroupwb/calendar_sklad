import React, { useState, useEffect } from 'react';
import { Calendar, LogOut, RefreshCw, PauseCircle } from 'lucide-react';
import { getAutoRefreshProgress, getTimeUntilNextRefresh, isAutoRefreshActive } from '../../utils/googleSheetsService';

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout?: () => void;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  isLoggedIn, 
  onLogout, 
  autoRefreshEnabled = false,
  onToggleAutoRefresh
}) => {
  const [refreshProgress, setRefreshProgress] = useState<number>(0);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number>(0);

  // Эффект для обновления прогресса каждую секунду
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    // Обновляем сразу при включении
    setRefreshProgress(getAutoRefreshProgress());
    setTimeUntilRefresh(getTimeUntilNextRefresh());

    // Обновляем каждую секунду
    const interval = setInterval(() => {
      setRefreshProgress(getAutoRefreshProgress());
      setTimeUntilRefresh(getTimeUntilNextRefresh());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  return (
    <header className="bg-neutral-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 text-neutral-300 mr-2" />
            <h1 className="text-xl font-semibold text-white">Календарь поставок на маркетплейсы</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {isLoggedIn && onToggleAutoRefresh && (
              <div className="relative">
                <button
                  onClick={onToggleAutoRefresh}
                  className={`flex items-center px-3 py-1.5 text-sm font-medium text-neutral-100 ${
                    autoRefreshEnabled ? 'bg-green-700 hover:bg-green-600' : 'bg-neutral-600 hover:bg-neutral-500'
                  } rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 focus-visible:ring-white transition-colors`}
                  title={autoRefreshEnabled ? 'Остановить автообновление' : 'Включить автообновление'}
                >
                  {autoRefreshEnabled ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1.5 text-neutral-100 animate-spin" />
                      <span>{timeUntilRefresh > 0 ? `Обновление через ${timeUntilRefresh} сек` : 'Автообновление включено'}</span>
                    </>
                  ) : (
                    <>
                      <PauseCircle className="w-4 h-4 mr-1.5 text-neutral-300" />
                      Автообновление выключено
                    </>
                  )}
                </button>
                
                {/* Прогресс-бар, показывающий время до следующего обновления */}
                {autoRefreshEnabled && (
                  <div className="absolute left-0 bottom-0 w-full bg-neutral-600 h-1 rounded-b-md overflow-hidden">
                    <div 
                      className="bg-blue-400 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${refreshProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {isLoggedIn && onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-neutral-100 bg-neutral-700 rounded-md hover:bg-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 focus-visible:ring-white transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1.5 text-neutral-300" />
                Выйти
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
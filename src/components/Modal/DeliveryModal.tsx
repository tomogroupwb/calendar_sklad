import React, { useState, Fragment, useEffect } from 'react';
import { DeliveryEvent, Marketplace, GoogleSheetsConfig } from '../../types';
import { getMarketplaceColor } from '../../utils/colorMap';
import { Package, MapPin, Users, ShoppingBag, X, Calendar, Edit, Save, Trash2, ExternalLink } from 'lucide-react';
import { updateDeliveryData } from '../../utils/googleSheetsService';
import { getConfigById } from '../../utils/sheetsConfigService';
import { Dialog, Transition } from '@headlessui/react';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: DeliveryEvent;
  onEventUpdate?: (updatedEvent: DeliveryEvent) => void;
  refreshData?: () => Promise<void>;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({ isOpen, onClose, event, onEventUpdate, refreshData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<DeliveryEvent>({ 
    ...event,
    // Всегда сохраняем оригинальные значения для этих полей
    department: event.department,
    marketplace: event.marketplace,
    configId: event.configId
  });
  const [isSaving, setIsSaving] = useState(false);
  const [headerColor, setHeaderColor] = useState('#6B7280'); // По умолчанию нейтральный серый
  
  // Состояние для Firebase конфигурации
  const [firebaseConfig, setFirebaseConfig] = useState<GoogleSheetsConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Загружаем Firebase конфигурацию если не найдена в localStorage
  useEffect(() => {
    const loadFirebaseConfig = async () => {
      if (!event.configId) return;
      
      // Сначала проверяем localStorage
      const localConfig = getConfigById(event.configId);
      if (localConfig) return;
      
      // Если не найдена в localStorage, загружаем из Firebase
      setIsLoadingConfig(true);
      try {
        const { getFirebaseConfigById } = await import('../../utils/firebaseConfigService');
        const fbConfig = await getFirebaseConfigById(event.configId);
        setFirebaseConfig(fbConfig);
      } catch (error) {
        console.error('Ошибка при загрузке Firebase конфигурации:', error);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadFirebaseConfig();
  }, [event.configId]);

  // Обновленная функция получения URL
  const getGoogleSheetsUrlUpdated = (): string | null => {
    if (!event.configId) return null;
    
    // Сначала пробуем localStorage
    const localConfig = getConfigById(event.configId);
    if (localConfig) {
      return `https://docs.google.com/spreadsheets/d/${localConfig.spreadsheetId}/edit`;
    }
    
    // Затем пробуем Firebase конфигурацию
    if (firebaseConfig) {
      return `https://docs.google.com/spreadsheets/d/${firebaseConfig.spreadsheetId}/edit`;
    }
    
    return null;
  };
  
  // Определяем цвет в зависимости от маркетплейса
  useEffect(() => {
    if (!editedEvent.marketplace) return;
    
    const marketplace = editedEvent.marketplace.toLowerCase();
    if (marketplace.includes('ozon')) {
      setHeaderColor('#0051E7'); // Синий для Ozon
    } else if (marketplace.includes('wildberries')) {
      setHeaderColor('#CB11AB'); // Фиолетовый для Wildberries
    } else if (marketplace.includes('яндекс') || marketplace.includes('yandex')) {
      setHeaderColor('#FFCC00'); // Желтый для Яндекс.Маркет
    } else {
      setHeaderColor('#6B7280'); // Нейтральный серый для остальных
    }
  }, [editedEvent.marketplace]);
  
  if (!isOpen) return null;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };
  
  const handleInputChange = (field: keyof DeliveryEvent, value: string | number) => {
    // Игнорируем изменения для полей department и marketplace
    if (field === 'department' || field === 'marketplace') {
      return;
    }
    
    setEditedEvent(prev => ({
      ...prev,
      [field]: field === 'itemCount' ? parseInt(value as string, 10) : value,
    }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Сохраняем оригинальные значения для подразделения и маркетплейса
      const updatedEvent = {
        ...editedEvent,
        department: event.department,
        marketplace: event.marketplace,
        configId: event.configId
      };
      
      // Обновляем данные в Google Sheets
      const success = await updateDeliveryData(updatedEvent, event.configId);
      
      if (success) {
        // Если доступна функция refreshData, используем её для получения свежих данных
        if (refreshData) {
          await refreshData();
        } 
        // Иначе обновляем через колбэк onEventUpdate
        else if (onEventUpdate) {
          onEventUpdate(updatedEvent);
        }
        
        setIsEditing(false);
      } else {
        alert('Произошла ошибка при сохранении изменений. Пожалуйста, попробуйте снова.');
      }
    } catch (error) {
      console.error('Ошибка при сохранении изменений:', error);
      alert('Произошла ошибка при сохранении изменений. Пожалуйста, попробуйте снова.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    setEditedEvent({ 
      ...event,
      department: event.department,
      marketplace: event.marketplace,
      configId: event.configId
    });
    setIsEditing(false);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={isSaving ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <div 
                  className="relative p-5 flex justify-between items-center"
                  style={{ backgroundColor: headerColor }}
                >
                  <Dialog.Title as="h3" className="text-xl font-bold text-white drop-shadow-sm">
                    {isEditing ? 'Редактирование поставки' : `${event.marketplace}${event.department ? ': ' + event.department : ''}${event.warehouse ? ': ' + event.warehouse : ''}`}
                  </Dialog.Title>
                  <div className="flex items-center space-x-2">
                    {/* Ссылка на Google таблицу */}
                    {(getGoogleSheetsUrlUpdated() || isLoadingConfig) && (
                      <a
                        href={getGoogleSheetsUrlUpdated() || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-white hover:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 p-1 rounded-full transition-all duration-150 ${isLoadingConfig ? 'opacity-50 cursor-wait' : ''}`}
                        title={isLoadingConfig ? 'Загрузка...' : 'Открыть Google таблицу'}
                        onClick={isLoadingConfig ? (e) => e.preventDefault() : undefined}
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={isSaving ? () => {} : onClose}
                      className="text-white hover:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 p-1 rounded-full transition-all duration-150"
                      disabled={isSaving}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 gap-5">
                  {/* Первая строка - Дата и Маркетплейс */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start space-x-4">
                      <Calendar className="w-5 h-5 mt-1 text-neutral-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 mb-1.5">Дата поставки</p>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editedEvent.date}
                            onChange={(e) => handleInputChange('date', e.target.value)}
                            className="w-full p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ozon focus:border-transparent text-sm"
                          />
                        ) : (
                          <p className="font-medium text-base">{formatDate(event.date)}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <ShoppingBag className="w-5 h-5 mt-1 text-neutral-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 mb-1.5">Маркетплейс</p>
                        <div className="font-medium text-base flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                            style={{ backgroundColor: headerColor }}
                          ></span>
                          {event.marketplace}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Вторая строка - Подразделение и Количество */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start space-x-4">
                      <Users className="w-5 h-5 mt-1 text-neutral-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 mb-1.5">Подразделение</p>
                        <p className="font-medium text-base">{event.department}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <Package className="w-5 h-5 mt-1 text-neutral-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 mb-1.5">Количество</p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editedEvent.itemCount}
                            onChange={(e) => handleInputChange('itemCount', e.target.value)}
                            className="w-full p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ozon focus:border-transparent text-sm"
                            min="1"
                          />
                        ) : (
                          <p className="font-medium text-base">{event.itemCount} шт.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Третья строка - Склад отгрузки */}
                  <div className="flex items-start space-x-4">
                    <MapPin className="w-5 h-5 mt-1 text-neutral-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-neutral-500 mb-1.5">Склад отгрузки</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEvent.warehouse}
                          onChange={(e) => handleInputChange('warehouse', e.target.value)}
                          className="w-full p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ozon focus:border-transparent text-sm"
                        />
                      ) : (
                        <p className="font-medium text-base">{event.warehouse}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Четвертая строка - Транзитный склад */}
                  <div className="flex items-start space-x-4">
                    <MapPin className="w-5 h-5 mt-1 text-neutral-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-neutral-500 mb-1.5">Транзитный склад</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEvent.transitWarehouse || ''}
                          onChange={(e) => handleInputChange('transitWarehouse', e.target.value)}
                          className="w-full p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ozon focus:border-transparent text-sm"
                          placeholder="Введите транзитный склад"
                        />
                      ) : (
                        <p className="font-medium text-base">{event.transitWarehouse || 'Не указан'}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Пятая строка - Номер реализации 1С */}
                  <div className="flex items-start space-x-4">
                    <span className="w-5 h-5 mt-1 text-neutral-500 flex-shrink-0 flex items-center justify-center font-bold">№</span>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-500 mb-1.5">Номер реализации 1С</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEvent.realizationNumber || ''}
                          onChange={(e) => handleInputChange('realizationNumber', e.target.value)}
                          className="w-full p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ozon focus:border-transparent text-sm"
                          placeholder="Введите номер реализации"
                        />
                      ) : (
                        <p className="font-medium text-base">{event.realizationNumber || 'Не указан'}</p>
                      )}
                    </div>
                  </div>
                  {/* Шестая строка - Номер поставки */}
                  <div className="flex items-start space-x-4">
                    <span className="w-5 h-5 mt-1 text-neutral-500 flex-shrink-0 flex items-center justify-center font-bold">№</span>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-500 mb-1.5">Номер поставки</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEvent.deliveryNumber || ''}
                          onChange={(e) => handleInputChange('deliveryNumber', e.target.value)}
                          className="w-full p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ozon focus:border-transparent text-sm"
                          placeholder="Введите номер поставки"
                        />
                      ) : (
                        <p className="font-medium text-base">{event.deliveryNumber || 'Не указан'}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-neutral-50 px-6 py-4 flex justify-end space-x-3 border-t">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 transition-colors duration-150"
                        disabled={isSaving}
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-ozon border border-transparent rounded-lg hover:bg-ozon-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-ozon focus-visible:ring-offset-2 transition-colors duration-150 flex items-center"
                        disabled={isSaving}
                      >
                        {isSaving ? 'Сохранение...' : (
                          <>
                            <Save className="w-4 h-4 mr-1.5" /> Сохранить
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 transition-colors duration-150"
                      >
                        Закрыть
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-ozon border border-transparent rounded-lg hover:bg-ozon-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-ozon focus-visible:ring-offset-2 transition-colors duration-150 flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1.5" /> Редактировать
                      </button>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DeliveryModal;
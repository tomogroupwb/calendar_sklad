

import React, { useState, useRef, Fragment, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { CalendarApi, ViewApi } from '@fullcalendar/core';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { CalendarViewState, DeliveryEvent, FilterOptions } from '../../types';
import { getEventClassNames, getDepartmentColor } from '../../utils/colorMap';
import DeliveryModal from '../Modal/DeliveryModal';
import { updateDeliveryData, clearToken } from '../../utils/googleSheetsService';
import { RadioGroup } from '@headlessui/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Package, Box } from 'lucide-react';

interface DeliveryCalendarProps {
  events: DeliveryEvent[];
  filters?: FilterOptions;
  onEventsUpdate?: (updatedEvents: DeliveryEvent[]) => void;
  refreshData?: () => Promise<void>;
}

// Функция для группировки поставок по датам и подсчета количества поставок в день
const countDeliveriesByDate = (events: DeliveryEvent[]): Record<string, number> => {
  const deliveryCounts: Record<string, number> = {};
  
  events.forEach(event => {
    const dateKey = event.date.split('T')[0]; // Отсекаем время, если оно есть
    if (deliveryCounts[dateKey]) {
      deliveryCounts[dateKey]++;
    } else {
      deliveryCounts[dateKey] = 1;
    }
  });
  
  return deliveryCounts;
};

// Функция для подсчета общего количества товаров по дням
const countItemsByDate = (events: DeliveryEvent[]): Record<string, number> => {
  const itemCounts: Record<string, number> = {};
  
  events.forEach(event => {
    const dateKey = event.date.split('T')[0]; // Отсекаем время, если оно есть
    if (itemCounts[dateKey]) {
      itemCounts[dateKey] += event.itemCount || 0;
    } else {
      itemCounts[dateKey] = event.itemCount || 0;
    }
  });
  
  return itemCounts;
};

// Функция для группировки поставок по датам и маркетплейсам
const countDeliveriesByDateAndMarketplace = (events: DeliveryEvent[]): Record<string, Record<string, number>> => {
  const marketplaceCounts: Record<string, Record<string, number>> = {};
  
  events.forEach(event => {
    const dateKey = event.date.split('T')[0]; // Отсекаем время, если оно есть
    if (!marketplaceCounts[dateKey]) {
      marketplaceCounts[dateKey] = {};
    }
    
    if (marketplaceCounts[dateKey][event.marketplace]) {
      marketplaceCounts[dateKey][event.marketplace]++;
    } else {
      marketplaceCounts[dateKey][event.marketplace] = 1;
    }
  });
  
  return marketplaceCounts;
};

// Расширим функцию подсчета товаров, чтобы она считала товары по маркетплейсам
const countItemsByDateAndMarketplace = (events: DeliveryEvent[]): Record<string, Record<string, number>> => {
  const itemCounts: Record<string, Record<string, number>> = {};
  
  events.forEach(event => {
    const dateKey = event.date.split('T')[0]; // Отсекаем время, если оно есть
    if (!itemCounts[dateKey]) {
      itemCounts[dateKey] = {};
    }
    
    if (!itemCounts[dateKey][event.marketplace]) {
      itemCounts[dateKey][event.marketplace] = 0;
    }
    
    itemCounts[dateKey][event.marketplace] += event.itemCount || 0;
  });
  
  return itemCounts;
};

// Получаем цвет для маркетплейса
const getMarketplaceColor = (marketplace: string): string => {
  if (!marketplace) return '#333333'; // Цвет по умолчанию, если marketplace не определен
  
  if (marketplace.toLowerCase().includes('wildberries')) {
    return '#CB11AB'; // Фиолетовый для Wildberries
  } else if (marketplace.toLowerCase().includes('ozon')) {
    return '#0051E7'; // Синий для OZON
  } else if (marketplace.toLowerCase().includes('яндекс')) {
    return '#FFCC00'; // Желтый для Яндекс.Маркет
  }
  return '#333333'; // Цвет по умолчанию
};

const DeliveryCalendar: React.FC<DeliveryCalendarProps> = ({ events, filters, onEventsUpdate, refreshData }) => {
  const [calendarView, setCalendarView] = useState<CalendarViewState>({
    activeView: 'dayGridMonth',
  });
  const [selectedEvent, setSelectedEvent] = useState<DeliveryEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const [currentTitle, setCurrentTitle] = useState('');

  // Filter events based on the current filter options
  const filteredEvents = events.filter(event => {
    // Проверка на null/undefined для event
    if (!event) {
      console.error('Получено пустое событие в фильтре');
      return false;
    }
    
    console.log('Фильтрация события:', event);
    
    if (filters?.marketplace && event.marketplace) {
      // Добавляем отладочное логирование
      console.log(`Filtering: filter=${filters.marketplace}, event=${event.marketplace}, type=${typeof event.marketplace}`);
      
      // Используем более гибкое сравнение для marketplace
      if (filters.marketplace.toLowerCase().includes('wild') || 
          filters.marketplace.toLowerCase() === 'wildberries' || 
          filters.marketplace.toLowerCase() === 'вайлдберриз' ||
          filters.marketplace.toLowerCase() === 'wb' || 
          filters.marketplace.toLowerCase() === 'вб') {
        // Если выбран Wildberries, проверяем содержит ли event.marketplace "wild", "wb" и т.д.
        const isWildberries = event.marketplace.toString().toLowerCase().includes('wild') || 
                              event.marketplace.toString().toLowerCase() === 'wb' ||
                              event.marketplace.toString().toLowerCase() === 'вб' ||
                              event.marketplace.toString().toLowerCase().includes('вайлдберриз') ||
                              event.marketplace.toString().toLowerCase() === 'wildberries';
        
        console.log(`Is Wildberries match: ${isWildberries}`);
        
        if (!isWildberries) {
          return false;
        }
      } else if (event.marketplace.toString().toLowerCase() !== filters.marketplace.toLowerCase()) {
        return false;
      }
    }
    
    if (filters?.warehouse && event.warehouse !== filters.warehouse) {
      return false;
    }
    
    // Фильтрация по подразделениям (множественный выбор)
    if (filters?.department && filters.department.length > 0) {
      if (!filters.department.includes(event.department)) {
        return false;
      }
    }
    
    // Фильтрация по периоду дат
    if (filters?.startDate || filters?.endDate) {
      const eventDate = new Date(event.date);
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (eventDate < startDate) return false;
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Устанавливаем конец дня
        if (eventDate > endDate) return false;
      }
    }
    
    return true;
  });

  // Подсчитываем количество поставок по датам
  const deliveriesByDate = countDeliveriesByDate(filteredEvents);
  
  // Подсчитываем общее количество товаров по датам
  const itemsByDate = countItemsByDate(filteredEvents);
  
  // Подсчитываем количество поставок по датам и маркетплейсам
  const deliveriesByDateAndMarketplace = countDeliveriesByDateAndMarketplace(filteredEvents);
  
  // Подсчитываем количество товаров по датам и маркетплейсам
  const itemsByDateAndMarketplace = countItemsByDateAndMarketplace(filteredEvents);

  // Transform the events for FullCalendar
  const calendarEvents = filteredEvents.map(event => {
    // Создаем HTML для событий с нужной структурой и цветом подразделения
    const departmentColor = getDepartmentColor(event.department);
    
    // Определяем класс для маркетплейса
    let marketplaceClass = '';
    if (event.marketplace && typeof event.marketplace === 'string') {
      const marketplaceLower = event.marketplace.toString().toLowerCase();
      if (marketplaceLower.includes('wild') || marketplaceLower === 'wb') {
        marketplaceClass = 'wildberries';
      } else if (marketplaceLower.includes('ozon')) {
        marketplaceClass = 'ozon';
      } else if (marketplaceLower.includes('яндекс') || marketplaceLower.includes('yandex')) {
        marketplaceClass = 'yandex';
      }
    }
    
    const eventContent = `
      <div class="event-content">
        <div class="event-item-count">${event.itemCount || ''}</div>
        <div class="event-details">
          <div class="event-marketplace ${marketplaceClass}">${event.marketplace || ''}</div>
          ${event.department ? `<div class="event-department" style="color: ${departmentColor} !important; font-weight: bold !important; text-shadow: 0 0 0.5px rgba(0,0,0,0.2);">${event.department}</div>` : ''}
          <div class="event-warehouse">${event.warehouse || ''}</div>
          ${event.deliveryNumber ? `<div class="event-delivery-number">Поставка: ${event.deliveryNumber}</div>` : ''}
        </div>
      </div>
    `;
    
    return {
      id: event.id,
      title: eventContent,
      date: event.date,
      extendedProps: {
        marketplace: event.marketplace,
        warehouse: event.warehouse,
        department: event.department,
        itemCount: event.itemCount,
        realizationNumber: event.realizationNumber
      },
      className: getEventClassNames(event.marketplace),
      html: true
    };
  });

  // Обновленный обработчик для открытия модального окна
  const openModalWithEvent = (event: DeliveryEvent) => {
    console.log('Opening modal with event:', event.id, event.marketplace, event.department);
    setSelectedEvent(event);
    setIsModalOpen(true);
  };
  
  // Добавляем логи при изменении состояния модального окна
  useEffect(() => {
    console.log('Modal state changed:', { isModalOpen, selectedEvent: selectedEvent?.id });
  }, [isModalOpen, selectedEvent]);

  // Обработчик клика на событие в FullCalendar
  const handleEventClick = (clickInfo: EventClickArg) => {
    const { id } = clickInfo.event;
    const originalEvent = events.find(e => e.id === id);
    if (originalEvent) {
      console.log('Event clicked in FullCalendar:', originalEvent.id, originalEvent.marketplace, originalEvent.department);
      openModalWithEvent(originalEvent);
    }
  };

  // Обновление функции обновления счетчиков
  const updateCounters = () => {
    setTimeout(() => {
      if (!calendarRef.current) return;
      
      const dayElements = document.querySelectorAll('.fc-daygrid-day');
      
      // Сначала удалим все существующие счетчики
      document.querySelectorAll('.day-items-counter, .day-event-counter').forEach(el => el.remove());
      
      // Теперь добавим счетчики в соответствующие ячейки
      dayElements.forEach(dayEl => {
        const dateAttr = dayEl.getAttribute('data-date');
        if (!dateAttr) return;
        
        const marketplaceCounts = deliveriesByDateAndMarketplace[dateAttr] || {};
        const marketplaceItemCounts = itemsByDateAndMarketplace[dateAttr] || {};
        
        // Проверяем, есть ли поставки или товары на этот день
        const hasDeliveries = Object.keys(marketplaceCounts).length > 0;
        const hasItems = Object.keys(marketplaceItemCounts).length > 0;
        
        if (hasDeliveries || hasItems) {
          // Убираем код доминирующего маркетплейса для счетчика товаров, т.к. теперь делаем отдельные счетчики
          
          // Добавляем счетчики поставок для каждого маркетплейса
          const dayTopEl = dayEl.querySelector('.fc-daygrid-day-top');
          if (dayTopEl) {
            // Обрабатываем каждый маркетплейс по отдельности
            const marketplaces = [...new Set([
              ...Object.keys(marketplaceCounts), 
              ...Object.keys(marketplaceItemCounts)
            ])];
            
            // Отсортируем маркетплейсы в порядке: Wildberries, OZON, Яндекс.Маркет
            const sortedMarketplaces = marketplaces.sort((a, b) => {
              if (a.toLowerCase().includes('wildberries') && !b.toLowerCase().includes('wildberries')) return -1;
              if (!a.toLowerCase().includes('wildberries') && b.toLowerCase().includes('wildberries')) return 1;
              if (a.toLowerCase().includes('ozon') && !b.toLowerCase().includes('ozon')) return -1;
              if (!a.toLowerCase().includes('ozon') && b.toLowerCase().includes('ozon')) return 1;
              return 0;
            });
            
            // Создаем счетчики для каждого маркетплейса
            sortedMarketplaces.forEach(marketplace => {
              const deliveryCount = marketplaceCounts[marketplace] || 0;
              const itemCount = marketplaceItemCounts[marketplace] || 0;
              
              // Определяем класс для маркетплейса
              let marketplaceClass = '';
              if (marketplace && typeof marketplace === 'string') {
                const marketplaceLower = marketplace.toString().toLowerCase();
                if (marketplaceLower.includes('wild') || marketplaceLower === 'wb') {
                  marketplaceClass = 'wildberries';
                } else if (marketplaceLower.includes('ozon')) {
                  marketplaceClass = 'ozon';
                } else if (marketplaceLower.includes('яндекс') || marketplaceLower.includes('yandex')) {
                  marketplaceClass = 'yandex';
                }
              }
              
              // Добавляем счетчик поставок, если есть поставки для этого маркетплейса
              if (deliveryCount > 0) {
                const deliveryCountEl = document.createElement('div');
                deliveryCountEl.className = `day-event-counter ${marketplaceClass}`;
                deliveryCountEl.title = `${deliveryCount} поставок на ${marketplace}`;
                
                // Добавляем иконку
                const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                iconSvg.setAttribute('viewBox', '0 0 24 24');
                iconSvg.setAttribute('width', '10');
                iconSvg.setAttribute('height', '10');
                iconSvg.setAttribute('fill', 'none');
                iconSvg.setAttribute('stroke', 'currentColor');
                iconSvg.setAttribute('stroke-width', '3');
                iconSvg.setAttribute('stroke-linecap', 'round');
                iconSvg.setAttribute('stroke-linejoin', 'round');
                
                // Рисуем коробку - простая иконка
                const boxPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                boxPath.setAttribute('d', 'M21 8V21H3V8');
                iconSvg.appendChild(boxPath);
                
                const topPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                topPath.setAttribute('d', 'M3 3h18l-9 5-9-5z');
                iconSvg.appendChild(topPath);
                
                // Добавляем иконку в счетчик
                deliveryCountEl.appendChild(iconSvg);
                
                // Добавляем текст счетчика
                const textSpan = document.createElement('span');
                textSpan.textContent = deliveryCount.toString();
                deliveryCountEl.appendChild(textSpan);
                
                dayTopEl.appendChild(deliveryCountEl);
              }
              
              // Добавляем счетчик товаров, если есть товары для этого маркетплейса
              if (itemCount > 0) {
                if (dayEl instanceof HTMLElement) {
                  dayEl.style.position = 'relative';
                  
                  const itemCountEl = document.createElement('div');
                  itemCountEl.className = `day-items-counter ${marketplaceClass}`;
                  itemCountEl.textContent = itemCount.toString();
                  itemCountEl.title = `${itemCount} товаров на ${marketplace}`;
                  dayEl.appendChild(itemCountEl);
                }
              }
            });
          }
        }
      });
    }, 100);
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const { id, title, extendedProps } = dropInfo.event;
    const newDate = dropInfo.event.startStr;
    // Подтверждение действия
    const confirmMove = window.confirm(`Перенести поставку на ${new Date(newDate).toLocaleDateString('ru-RU')}?`);
    if (!confirmMove) {
      dropInfo.revert();
      return;
    }
    try {
      // Находим событие в оригинальном массиве
      const eventIndex = events.findIndex(event => event.id === id);
      if (eventIndex === -1) return;
      
      // Создаем копию массива событий
      const updatedEvents = [...events];
      
      // Обновляем дату перетащенного события
      updatedEvents[eventIndex] = {
        ...updatedEvents[eventIndex],
        date: newDate,
      };
      
      // Обновляем данные в Google Sheets
      const updateResult = await updateDeliveryData(updatedEvents[eventIndex], updatedEvents[eventIndex].configId);
      
      if (!updateResult) {
        // Если обновление не удалось, возвращаем событие на исходную позицию
        dropInfo.revert();
        
        // Если ошибка связана с авторизацией, очищаем токен и перезагружаем страницу
        // для перенаправления на форму авторизации
        clearToken();
        alert('Сессия истекла. Пожалуйста, авторизуйтесь снова.');
        window.location.reload();
        return;
      }
      
      // Обновляем данные из Google Sheets, чтобы получить актуальную информацию
      if (refreshData) {
        await refreshData();
        // Обновляем счетчики после обновления данных
        updateCounters();
      } else {
        // Если функция refreshData не передана, используем локальное обновление
        if (onEventsUpdate) {
          onEventsUpdate(updatedEvents);
          // Обновляем счетчики после локального обновления
          updateCounters();
        }
      }
      
      console.log(`Событие "${title}" перемещено на ${newDate}`);
    } catch (error) {
      console.error('Ошибка при обновлении события:', error);
      alert('Произошла ошибка при обновлении события. Пожалуйста, попробуйте снова.');
      // Возвращаем событие на исходную позицию
      dropInfo.revert();
      
      // Если ошибка связана с авторизацией, перезагружаем страницу
      if (error instanceof Error && error.message.includes('авторизация')) {
        clearToken();
        alert('Требуется повторная авторизация. Страница будет перезагружена.');
        window.location.reload();
      }
    }
  };

  const handleEventUpdate = async (updatedEvent: DeliveryEvent) => {
    // Находим событие в оригинальном массиве
    const eventIndex = events.findIndex(event => event.id === updatedEvent.id);
    if (eventIndex === -1) return;
    
    // Обновляем данные из Google Sheets, чтобы получить актуальную информацию
    if (refreshData) {
      await refreshData();
      // Обновляем счетчики после обновления данных
      updateCounters();
    } else {
      // Если функция refreshData не передана, используем локальное обновление
      const updatedEvents = [...events];
      updatedEvents[eventIndex] = updatedEvent;
      
      if (onEventsUpdate) {
        onEventsUpdate(updatedEvents);
        // Обновляем счетчики после локального обновления
        updateCounters();
      }
    }
    
    console.log(`Событие "${updatedEvent.marketplace}: ${updatedEvent.warehouse}" обновлено`);
  };

  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    console.log('Closing modal via handleCloseModal');
    setIsModalOpen(false);
    // Устанавливаем selectedEvent в null с небольшой задержкой,
    // чтобы убедиться, что модальное окно полностью закрылось
    setTimeout(() => {
      setSelectedEvent(null);
    }, 300);
  };

  const viewOptions = [
    { name: 'Месяц', value: 'dayGridMonth' },
    { name: 'Список', value: 'listWeek' },
  ];

  // Улучшенный обработчик изменения вида
  const handleViewChange = (newView: string) => {
    setCalendarView({
      activeView: newView as CalendarViewState['activeView']
    });
    
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(newView);
      setCurrentTitle(calendarApi.view.title);
    }
  };

  useEffect(() => {
    if (calendarRef.current) {
      updateCounters();
    }
  }, [filteredEvents, deliveriesByDate, itemsByDate]);

  return (
    <div className="w-full h-full flex flex-col bg-neutral-50 rounded-lg shadow-lg overflow-hidden transition-all duration-300">
      {/* Custom Header */}
      <div className="mb-4 p-2 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between bg-white border-b border-neutral-200 shadow-sm">
        <div className="flex flex-wrap items-center space-x-2 mb-2 sm:mb-0">
          <div className="bg-ozon text-white p-2 rounded-lg shadow-md">
            <CalendarIcon className="h-4 sm:h-5 w-4 sm:w-5" />
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (calendarRef.current) {
                  const calendarApi = calendarRef.current.getApi();
                  calendarApi.prev();
                  setCurrentTitle(calendarApi.view.title);
                }
              }}
              className="relative inline-flex items-center justify-center rounded-full p-1 sm:p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ozon focus:ring-offset-1 transition-all duration-200"
            >
              <span className="sr-only">Предыдущий</span>
              <ChevronLeft className="h-4 sm:h-5 w-4 sm:w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (calendarRef.current) {
                  const calendarApi = calendarRef.current.getApi();
                  calendarApi.next();
                  setCurrentTitle(calendarApi.view.title);
                }
              }}
              className="relative inline-flex items-center justify-center rounded-full p-1 sm:p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ozon focus:ring-offset-1 transition-all duration-200"
            >
              <span className="sr-only">Следующий</span>
              <ChevronRight className="h-4 sm:h-5 w-4 sm:w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (calendarRef.current) {
                  const calendarApi = calendarRef.current.getApi();
                  calendarApi.today();
                  setCurrentTitle(calendarApi.view.title);
                }
              }}
              className="ml-1 sm:ml-2 rounded-md border border-neutral-300 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-ozon focus:ring-offset-1 transition-all duration-200"
            >
              Сегодня
            </button>
          </div>
          
          <h2 className="pl-1 sm:pl-2 text-base sm:text-lg font-medium text-neutral-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-none">
            {currentTitle}
          </h2>
          
          {(filters.startDate || filters.endDate) && (
            <div className="ml-1 sm:ml-3 text-xs sm:text-sm bg-ozon-light text-ozon-dark px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center mt-1 sm:mt-0">
              <CalendarIcon className="h-3 w-3 mr-1" />
              <span className="truncate max-w-[150px] sm:max-w-none">
                {filters.startDate && filters.endDate 
                  ? `${new Date(filters.startDate).toLocaleDateString('ru-RU')} — ${new Date(filters.endDate).toLocaleDateString('ru-RU')}`
                  : filters.startDate 
                    ? `От ${new Date(filters.startDate).toLocaleDateString('ru-RU')}`
                    : filters.endDate 
                      ? `До ${new Date(filters.endDate).toLocaleDateString('ru-RU')}`
                      : ''
                }
              </span>
            </div>
          )}
        </div>
        <RadioGroup value={calendarView.activeView} onChange={handleViewChange} className="inline-flex rounded-lg shadow-sm mt-2 sm:mt-0">
          {viewOptions.map((option) => (
            <RadioGroup.Option
              key={option.value}
              value={option.value}
              as={Fragment}
            >
              {({ checked, active }) => (
                <button
                  type="button"
                  className={`
                    ${checked ? 'bg-ozon text-white shadow-inner' : 'bg-white text-neutral-800 hover:bg-ozon-light'}
                    ${active ? 'ring-2 ring-offset-1 ring-ozon' : ''}
                    relative inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium 
                    focus:z-10 focus:outline-none focus:ring-1 focus:ring-ozon focus:border-ozon
                    first:rounded-l-lg last:rounded-r-lg border border-neutral-300 -ml-px
                    transition-all duration-200
                  `}
                >
                  {option.name}
                </button>
              )}
            </RadioGroup.Option>
          ))}
        </RadioGroup>
      </div>

      <div className="flex-1 px-2 sm:px-4 pb-4">
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Адаптивные стили для мобильных устройств */
            @media (max-width: 640px) {
              .fc-toolbar-title {
                font-size: 1rem !important;
              }
              
              .fc th {
                font-size: 0.75rem !important;
              }
              
              .fc .fc-daygrid-day-number {
                font-size: 0.75rem !important;
                padding: 2px !important;
              }
              
              .fc-event-title {
                font-size: 0.7rem !important;
              }
              
              .fc-daygrid-event {
                padding: 1px !important;
              }
              
              .fc-col-header-cell {
                padding: 2px !important;
              }
              
              .fc .fc-daygrid-day.fc-day-today {
                background-color: white !important;
              }
              
              /* Исправляем ширину ячеек в мобильном виде */
              .fc-view-harness {
                min-width: 100% !important;
                overflow-x: auto !important;
              }
              
              /* Уменьшаем отступы в ячейках таблицы */
              .fc td, .fc th {
                padding: 1px !important;
              }
              
              /* Метка "Сегодня" только для представления месяца */
              .fc-dayGridMonth-view .fc-day-today::before {
                content: "Сегодня" !important;
                position: absolute !important;
                top: 2px !important;
                left: 32px !important;
                background-color: #0051E7 !important;
                color: white !important;
                padding: 1px 5px !important;
                border-radius: 3px !important;
                font-size: 9px !important;
                font-weight: bold !important;
                z-index: 10 !important;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
              }
              
              /* Скрываем метку "Сегодня" для представления списка */
              .fc-listWeek-view .fc-day-today::before {
                display: none !important;
              }
            }
            
            .fc-event-title {
              white-space: normal !important;
              overflow: visible !important;
              line-height: 1.1 !important;
              color: #000 !important;
            }
            
            .fc-daygrid-event {
              white-space: normal !important;
              overflow: hidden !important;
            }
            
            .fc-event-main {
              padding: 2px 4px !important;
              color: #000 !important;
            }
            
            .fc-event-title-container, .fc-event-main-frame {
              color: #000 !important;
            }
            
            .fc-event * {
              color: #000 !important;
            }

            .event-content {
              position: relative;
              width: 100%;
              min-height: 40px;
              color: #000 !important;
            }

            .event-item-count {
              position: absolute;
              top: 0;
              right: 0;
              font-weight: bold;
              font-size: 11px;
              background-color: rgba(255, 255, 255, 0.7);
              padding: 1px 3px;
              border-radius: 3px;
              color: #000 !important;
            }

            .event-details {
              padding-top: 2px;
              font-size: 11px;
              color: #000 !important;
            }

            .event-marketplace {
              font-weight: bold;
              margin-bottom: 3px;
              color: #000 !important;
              display: inline-block;
            }

            /* Дополнительные стили для маркетплейсов */
            .event-marketplace.wildberries {
              background-color: #CB11AB !important;
              color: white !important;
              padding: 2px 6px !important;
              border-radius: 4px !important;
              font-weight: bold !important;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
              margin-bottom: 4px !important;
              display: inline-block !important;
            }
            
            .event-marketplace.ozon {
              background-color: #0051E7 !important;
              color: white !important;
              padding: 2px 6px !important;
              border-radius: 4px !important;
              font-weight: bold !important;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
              margin-bottom: 4px !important;
              display: inline-block !important;
            }

            .event-department {
              margin-bottom: 1px;
              color: #000 !important;
            }

            .event-warehouse {
              font-style: italic;
              color: #000 !important;
            }
            
            /* Стили для скроллинга внутри ячеек */
            .fc-daygrid-day-events {
              max-height: 200px;
              overflow-y: auto !important;
              padding-right: 2px;
            }
            
            .fc-daygrid-day-events::-webkit-scrollbar {
              width: 4px;
            }
            
            .fc-daygrid-day-events::-webkit-scrollbar-track {
              background: rgba(0,0,0,0.05);
              border-radius: 2px;
            }
            
            .fc-daygrid-day-events::-webkit-scrollbar-thumb {
              background: rgba(0,0,0,0.2);
              border-radius: 2px;
            }
            
            .fc-daygrid-day-events::-webkit-scrollbar-thumb:hover {
              background: rgba(0,0,0,0.3);
            }
            
            /* Убираем "+more" индикатор, так как теперь есть скроллинг */
            .fc-daygrid-more-link {
              display: none !important;
            }
            
            /* Добавляем небольшой отступ между событиями */
            .fc-daygrid-event-harness {
              margin-bottom: 3px !important;
            }
            
            /* Стиль для счетчика событий в ячейке календаря */
            .fc-daygrid-day-top {
              justify-content: flex-start !important; /* Выравниваем по левому краю согласно предыдущим настройкам */
              padding: 4px !important;
              position: relative !important;
              z-index: 5 !important;
            }
            
            .day-event-counter {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              background-color: #0051E7 !important; /* Цвет по умолчанию */
              color: white !important;
              font-size: 11px !important;
              font-weight: bold !important;
              min-width: 28px !important;
              width: auto !important;
              height: 20px !important;
              border-radius: 10px !important;
              padding: 2px 6px !important;
              margin-left: 4px !important;
              flex-shrink: 0 !important;
              box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
              position: absolute !important;
              right: 4px !important;
              top: 4px !important;
              z-index: 10 !important;
              gap: 4px !important;
            }
            
            /* Счетчик для Wildberries */
            .day-event-counter.wildberries {
              background-color: #CB11AB !important;
              right: 4px !important;
            }
            
            /* Счетчик для OZON */
            .day-event-counter.ozon {
              background-color: #0051E7 !important;
              right: 40px !important; /* Смещаем влево от предыдущего счетчика */
            }
            
            /* Счетчик для Яндекс.Маркет */
            .day-event-counter.yandex {
              background-color: #FFCC00 !important;
              right: 76px !important; /* Смещаем влево от предыдущего счетчика */
              color: #333 !important; /* Темный текст для контраста */
            }
            
            .day-event-counter svg {
              width: 10px !important;
              height: 10px !important;
              stroke-width: 3px !important;
            }
            
            .day-items-counter {
              position: absolute !important;
              top: 28px !important;
              right: 4px !important;
              left: auto !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              color: white !important;
              font-size: 11px !important;
              font-weight: bold !important;
              min-width: 25px !important;
              height: 20px !important;
              border-radius: 10px !important;
              padding: 2px 6px !important;
              z-index: 10 !important;
              box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
            }
            
            /* Счетчик товаров для Wildberries */
            .day-items-counter.wildberries {
              background-color: #CB11AB !important;
              right: 4px !important;
            }
            
            /* Счетчик товаров для OZON */
            .day-items-counter.ozon {
              background-color: #0051E7 !important;
              right: 40px !important; /* Смещаем влево от предыдущего счетчика */
            }
            
            /* Счетчик товаров для Яндекс.Маркет */
            .day-items-counter.yandex {
              background-color: #FFCC00 !important;
              right: 76px !important; /* Смещаем влево от предыдущего счетчика */
              color: #333 !important; /* Темный текст для контраста */
            }
            
            .day-counters-container {
              display: flex !important;
              align-items: center !important;
              justify-content: flex-end !important;
              gap: 4px !important;
              pointer-events: none !important;
            }

            /* Настраиваем позиционирование для ячейки дня */
            .fc-daygrid-day-frame {
              position: relative !important;
            }
            
            /* Делаем дни относительными для корректного позиционирования */
            .fc-daygrid-day {
              position: relative !important;
            }

            /* Дополнительные стили для модального окна */
            .modal-backdrop {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              background-color: rgba(0, 0, 0, 0.5) !important;
              z-index: 9999 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
            }
            
            /* Для списочного представления */
            @media (max-width: 640px) {
              .fc-list-day-cushion {
                padding: 4px 8px !important;
                position: relative !important;
              }
              
              .fc-list-event td {
                padding: 4px 8px !important;
              }
              
              .fc-list-event-title a {
                font-size: 0.8rem !important;
              }
              
              .fc-list-event-time {
                font-size: 0.7rem !important;
              }
              
              /* Исправление для метки "Сегодня" в списочном представлении */
              .fc-day-today::before {
                display: none !important; /* Скрываем метку "Сегодня" в списочном представлении */
              }
              
              /* Добавляем специальную метку для списочного представления */
              .fc-list-day.fc-day-today .fc-list-day-cushion::after {
                content: "Сегодня" !important;
                position: absolute !important;
                top: 50% !important;
                right: 8px !important;
                transform: translateY(-50%) !important;
                background-color: #0051E7 !important;
                color: white !important;
                padding: 1px 5px !important;
                border-radius: 3px !important;
                font-size: 9px !important;
                font-weight: bold !important;
                z-index: 10 !important;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
              }
              
              /* Добавляем отступ справа для дня недели, чтобы метка "Сегодня" не перекрывала день */
              .fc-list-day.fc-day-today .fc-list-day-text {
                margin-right: 60px !important;
              }
              
              /* Адаптивные стили для мобильных счетчиков */
              .day-event-counter {
                font-size: 9px !important;
                min-width: 22px !important;
                height: 16px !important;
                padding: 1px 4px !important;
                right: 2px !important;
              }
              
              .day-event-counter.ozon {
                right: 30px !important;
              }
              
              .day-event-counter.yandex {
                right: 58px !important;
              }
              
              .day-items-counter {
                font-size: 9px !important;
                min-width: 22px !important;
                height: 16px !important;
                padding: 1px 4px !important;
                top: 24px !important;
                right: 2px !important;
              }
              
              .day-items-counter.ozon {
                right: 30px !important;
              }
              
              .day-items-counter.yandex {
                right: 58px !important;
              }
              
              .day-event-counter svg {
                width: 8px !important;
                height: 8px !important;
              }
            }
            `
          }}
        />
        
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={false}
          initialView={calendarView.activeView}
          events={calendarEvents}
          eventClick={handleEventClick}
          height="auto"
          locale="ru"
          firstDay={1}
          allDayText=""
          buttonText={{
            today: 'Сегодня',
            month: 'Месяц',
            list: 'Список',
          }}
          viewDidMount={(viewInfo: { view: ViewApi }) => {
            setCurrentTitle(viewInfo.view.title);
          }}
          datesSet={() => {
            updateCounters();
          }}
          dayMaxEvents={false}
          dayMaxEventRows={false}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          dayCellClassNames="hover:bg-neutral-100 cursor-pointer transition-colors duration-150"
          eventClassNames="text-xs font-medium leading-tight p-1 overflow-hidden transform hover:scale-105 transition-transform duration-150"
          slotLabelClassNames="text-neutral-700 font-medium"
          dayHeaderClassNames="text-neutral-800 font-medium"
          weekNumberClassNames="text-neutral-700 font-medium"
          allDayClassNames="bg-neutral-100 text-neutral-800"
          nowIndicatorClassNames="border-2 border-red-500"
          eventContent={(arg) => {
            return { html: arg.event.title };
          }}
        />

        {/* Модальное окно должно отображаться при наличии selectedEvent и isModalOpen=true */}
        {selectedEvent && isModalOpen && (
          <DeliveryModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            event={selectedEvent}
            onEventUpdate={handleEventUpdate}
            refreshData={refreshData}
          />
        )}
      </div>
    </div>
  );
};

export default DeliveryCalendar;
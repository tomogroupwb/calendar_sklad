import { DeliveryEvent, SheetsData, GoogleSheetsConfig } from '../types';
import { getConfigById, getAllConfigs } from './sheetsConfigService';
import { getDepartmentColor } from './colorMap';

// Получаем API ключ из переменных окружения
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

/**
 * Получить access token из localStorage
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('google_access_token');
};

/**
 * Получить refresh token из localStorage
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('google_refresh_token');
};

/**
 * Проверить, истек ли срок действия токена
 * 
 * Примечание: Это упрощенная проверка. Мы не можем точно определить,
 * истек ли срок действия токена без отправки запроса к API.
 * Для правильной реализации требуется инфраструктура OAuth 2.0 с обновлением токена.
 */
export const isTokenExpired = (): boolean => {
  const token = getAccessToken();
  if (!token) {
    console.log('Токен отсутствует в localStorage');
    return true;
  }
  
  // Получаем метку времени последней авторизации из localStorage
  const lastAuthTime = localStorage.getItem('google_auth_timestamp');
  if (!lastAuthTime) {
    console.log('Метка времени авторизации отсутствует в localStorage');
    return true;
  }
  
  // Срок действия токена обычно 1 час (3600 секунд)
  // Используем немного меньшее время для подстраховки
  const tokenExpiryTime = 3500 * 1000; // в миллисекундах (58 минут)
  const currentTime = new Date().getTime();
  const authTime = parseInt(lastAuthTime, 10);
  
  // Защита от неверного времени авторизации
  if (isNaN(authTime) || authTime <= 0) {
    console.log('Неверное время авторизации:', lastAuthTime);
    return false; // Считаем токен действительным, если не можем определить
  }
  
  // Защита от слишком быстрого истечения срока (например, сразу после авторизации)
  // Минимальное время жизни токена - 5 минут
  const minimumTokenLifetime = 5 * 60 * 1000; // 5 минут в миллисекундах
  if (currentTime - authTime < minimumTokenLifetime) {
    console.log('Токен получен менее 5 минут назад, считаем его действительным');
    return false;
  }
  
  const timeDiff = currentTime - authTime;
  const isExpired = timeDiff > tokenExpiryTime;
  
  console.log('Проверка токена:', { 
    authTime: new Date(authTime).toISOString(),
    currentTime: new Date(currentTime).toISOString(),
    timeDiff: Math.round(timeDiff / 1000) + ' секунд',
    tokenExpiryTime: Math.round(tokenExpiryTime / 1000) + ' секунд',
    isExpired,
    hasRefreshToken: !!getRefreshToken()
  });
  
  return isExpired;
};

/**
 * Сохранить access token в localStorage
 */
export const setAccessToken = (token: string): void => {
  if (!token) {
    console.error('Попытка сохранить пустой токен, операция отменена');
    return;
  }
  
  try {
    // Сохраняем токен
    localStorage.setItem('google_access_token', token);
    
    // Всегда обновляем метку времени при установке токена
    const currentTime = new Date().getTime().toString();
    localStorage.setItem('google_auth_timestamp', currentTime);
    
    // Для проверки успешного сохранения
    const savedToken = localStorage.getItem('google_access_token');
    const savedTimestamp = localStorage.getItem('google_auth_timestamp');
    
    console.log('Сохранен Google Access Token и метка времени авторизации:', {
      tokenSaved: !!savedToken,
      tokenLength: savedToken ? savedToken.length : 0,
      timestamp: savedTimestamp,
      timestampDate: savedTimestamp ? new Date(parseInt(savedTimestamp)).toISOString() : null
    });
  } catch (error) {
    console.error('Ошибка при сохранении токена в localStorage:', error);
  }
};

/**
 * Сохранить refresh token в localStorage
 */
export const setRefreshToken = (token: string): void => {
  if (!token) {
    console.warn('Попытка сохранить пустой refresh token, операция отменена');
    return;
  }
  
  try {
    localStorage.setItem('google_refresh_token', token);
    console.log('Refresh token сохранен в localStorage');
  } catch (error) {
    console.error('Ошибка при сохранении refresh token в localStorage:', error);
  }
};

// Функция для очистки токенов
export const clearToken = (): void => {
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_auth_timestamp');
  localStorage.removeItem('google_refresh_token');
  console.log('Все токены авторизации очищены');
};

/**
 * Получение данных - теперь работает только с конфигурациями
 */
export const fetchDeliveryData = async (): Promise<DeliveryEvent[]> => {
  // Получаем все конфигурации из localStorage
  const configs = getAllConfigs();
  
  if (configs.length === 0) {
    console.log('Нет сохраненных конфигураций Google таблиц');
    return import.meta.env.DEV ? getMockDeliveryData() : [];
  }
  
  // Используем все имеющиеся конфигурации для загрузки данных
  const configIds = configs.map((config: GoogleSheetsConfig) => config.id);
  return fetchDeliveryDataFromMultipleConfigs(configIds);
};

/**
 * Получение данных из Google Sheets с использованием конкретной конфигурации
 */
export const fetchDeliveryDataFromConfig = async (configId: string): Promise<DeliveryEvent[]> => {
  console.log(`[DEBUG] Начинаем загрузку данных для configId: ${configId}`);
  
  // Проверяем наличие и валидность токена
  const accessToken = getAccessToken();
  if (accessToken) {
    // Проверяем, истек ли токен
    if (isTokenExpired()) {
      console.log('[DEBUG] Токен истек, пытаемся обновить...');
      const refreshSuccess = await refreshFirebaseGoogleToken();
      if (!refreshSuccess) {
        console.error('[ERROR] Не удалось обновить токен, требуется повторная авторизация');
        clearToken();
        throw new Error('Требуется повторная авторизация OAuth');
      } else {
        console.log('[DEBUG] Токен успешно обновлен через Firebase');
      }
    }
  }
  
  // Пытаемся получить конфигурацию из localStorage
  const config = getConfigById(configId);
  
  // Если конфигурация не найдена в localStorage, пытаемся получить из Firebase
  if (!config) {
    console.log(`[DEBUG] Конфигурация не найдена в localStorage, проверяем Firebase для ID: ${configId}`);
    
    try {
      // Импортируем асинхронно, чтобы избежать циклических зависимостей
      const { getFirebaseConfigById } = await import('./firebaseConfigService');
      const firebaseConfig = await getFirebaseConfigById(configId);
      
      if (!firebaseConfig) {
        console.error(`[ERROR] Конфигурация с ID ${configId} не найдена ни в localStorage, ни в Firebase`);
        return [];
      }
      
      console.log(`[DEBUG] Найдена конфигурация в Firebase:`, firebaseConfig);
      
      // Используем конфигурацию из Firebase
      const { spreadsheetId, sheetName } = firebaseConfig;
      
      console.log(`[DEBUG] Начинаем запрос данных из Google Sheets (ID: ${spreadsheetId}, Лист: ${sheetName})...`);
      
      // Получаем всю таблицу целиком
      const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`);
      url.searchParams.append('key', API_KEY);
      
      console.log(`[DEBUG] URL для запроса всей таблицы: ${url.toString()}`);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ERROR] Google Sheets API ответил с ошибкой:', response.status, errorText);
        throw new Error(`Failed to fetch Google Sheets data: ${response.status} ${errorText}`);
      }
      
      const data: SheetsData = await response.json();
      console.log(`[DEBUG] Получены данные из таблицы, строк: ${data.values?.length || 0}`);
      
      // Удаляем заголовочную строку (первую строку)
      if (data.values && data.values.length > 0) {
        data.values = data.values.slice(1);
      }
      
      // Трансформируем сырые данные в DeliveryEvent объекты
      const events = transformSheetsData(data, firebaseConfig);
      console.log(`[DEBUG] Загружено ${events.length} событий из таблицы "${firebaseConfig.name}"`);
      return events;
    } catch (error) {
      console.error(`[ERROR] Ошибка при получении/обработке данных из Firebase:`, error);
      
      // Проверяем режим разработки
      if (import.meta.env.DEV) {
        console.log('[DEBUG] Возвращаем мок-данные для отладки (только в режиме разработки)');
        return getMockDeliveryData();
      }
      
      throw error;
    }
  }
  
  console.log(`[DEBUG] Загрузка данных из таблицы "${config.name}" (ID: ${configId})...`);
  
  const { spreadsheetId, sheetName } = config;
  
  // Используем новый метод, который не зависит от расположения столбцов
  // Запрашиваем все данные из таблицы и затем фильтруем необходимые столбцы
  try {
    console.log(`[DEBUG] Начинаем запрос всех данных из Google Sheets (${spreadsheetId}, ${sheetName})...`);
    
    // Получаем всю таблицу целиком
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`);
    url.searchParams.append('key', API_KEY);
    
    console.log(`[DEBUG] URL для запроса всей таблицы: ${url.toString()}`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] Google Sheets API ответил с ошибкой:', response.status, errorText);
      throw new Error(`Failed to fetch Google Sheets data: ${response.status} ${errorText}`);
    }
    
    const data: SheetsData = await response.json();
    console.log(`[DEBUG] Получены все данные из таблицы, строк: ${data.values?.length || 0}`);
    
    // Удаляем заголовочную строку (первую строку)
    if (data.values && data.values.length > 0) {
      data.values = data.values.slice(1);
    }
    
    // Трансформируем сырые данные в DeliveryEvent объекты
    const events = transformSheetsData(data, config);
    console.log(`[DEBUG] Загружено ${events.length} событий из таблицы "${config.name}"`);
    return events;
  } catch (error) {
    console.error(`[ERROR] Ошибка при получении данных из таблицы "${config.name}":`, error);
    
    // Проверяем режим разработки
    if (import.meta.env.DEV) {
      console.log('[DEBUG] Возвращаем мок-данные для отладки (только в режиме разработки)');
      return getMockDeliveryData();
    }
    
    throw error;
  }
};

/**
 * Получение данных из нескольких конфигураций и их объединение
 */
export const fetchDeliveryDataFromMultipleConfigs = async (configIds: string[]): Promise<DeliveryEvent[]> => {
  // Если нет конфигураций, возвращаем мок-данные в режиме разработки
  if (configIds.length === 0) {
    console.log('Не выбрано ни одной конфигурации');
    return import.meta.env.DEV ? getMockDeliveryData() : [];
  }
  
  console.log(`Загружаем данные из ${configIds.length} конфигураций...`);
  
  const promises = configIds.map(configId => fetchDeliveryDataFromConfig(configId));
  const results = await Promise.all(promises);
  
  // Объединяем все результаты
  const allEvents = results.flat();
  
  // Отладочная информация
  console.log(`Всего загружено событий: ${allEvents.length}`);
  const uniqueIds = new Set(allEvents.map(e => e.id)).size;
  console.log(`Уникальных ID событий: ${uniqueIds}`);
  
  if (uniqueIds < allEvents.length) {
    console.warn(`Обнаружены дубликаты ID: ${allEvents.length - uniqueIds} повторяющихся ID`);
  }
  
  return allEvents;
};

/**
 * Базовая функция получения данных из Google Sheets
 */
export const fetchDeliveryDataFromSheet = async (
  spreadsheetId: string, 
  range: string,
  config?: GoogleSheetsConfig
): Promise<DeliveryEvent[]> => {
  try {
    console.log(`Начинаем запрос к Google Sheets (${spreadsheetId}, ${range})...`);
    
    // Проверяем наличие и валидность токена
    const accessToken = getAccessToken();
    
    // Создаем URL с правильным кодированием параметров
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`);
    
    // Добавляем API ключ только если нет токена доступа
    if (!accessToken) {
      url.searchParams.append('key', API_KEY);
      console.log('Используем API ключ для запроса (нет токена доступа)');
    }
    
    console.log(`URL для запроса: ${url.toString()}`);
    
    // Подготавливаем параметры запроса
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Важно для CORS запросов - устанавливаем режим CORS
      mode: 'cors',
      credentials: 'same-origin'
    };
    
    // Добавляем токен авторизации, если он есть
    if (accessToken) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${accessToken}`
      };
      console.log('Используем OAuth токен для запроса');
    }
    
    // Выполняем запрос
    let response: Response;
    
    try {
      response = await fetch(url.toString(), fetchOptions);
    } catch (fetchError) {
      console.error('Ошибка при выполнении fetch запроса:', fetchError);
      
      // Проверяем, является ли ошибка CORS-ошибкой
      if (fetchError instanceof TypeError || 
          String(fetchError).includes('CORS') || 
          String(fetchError).includes('network')) {
        
        console.warn('Возможно, это CORS ошибка. Пробуем альтернативный метод запроса...');
        
        // Здесь можно реализовать альтернативный метод запроса,
        // например, через прокси-сервер или через backend
        
        throw new Error(`CORS ошибка при запросе к Google Sheets API. Убедитесь, что домен ${window.location.origin} добавлен в список разрешенных в Google Cloud Console.`);
      }
      
      throw fetchError;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API ответил с ошибкой:', response.status, errorText);
      
      // Если ошибка авторизации, попробуем обновить токен и повторить запрос
      if (response.status === 401) {
        console.log('Ошибка авторизации, пробуем обновить токен...');
        const refreshSuccess = await refreshFirebaseGoogleToken();
        if (refreshSuccess) {
          console.log('Токен обновлен, повторяем запрос...');
          // Рекурсивно повторяем вызов функции с обновленным токеном
          return fetchDeliveryDataFromSheet(spreadsheetId, range, config);
        }
      }
      
      // Если получили ошибку CORS, НЕ очищаем токен, просто сообщаем об этом
      if (errorText.includes('CORS') || errorText.includes('Origin') || response.status === 403) {
        console.warn(`CORS или доступ запрещен. Проверьте настройки CORS в Google Cloud Console. Статус: ${response.status}`);
        console.warn(`Не очищаем токены для возможности повторных попыток.`);
        throw new Error(`Ошибка доступа к Google Sheets API. Проверьте настройки вашего проекта в Google Cloud Console и добавьте домен ${window.location.origin} в список разрешенных.`);
      }
      
      throw new Error(`Ошибка Google Sheets API: ${response.status} ${errorText}`);
    }
    
    const data: SheetsData = await response.json();
    console.log('Получен ответ от Google Sheets API:', data);
    
    // Transform the raw data into DeliveryEvent objects
    return transformSheetsData(data, config);
  } catch (error) {
    console.error('Ошибка при получении данных из Google Sheets:', error);
    
    // Не очищаем токен при каждой ошибке, чтобы не терять доступ сразу же
    // Очистка токена должна происходить только при явных проблемах с авторизацией (401)
    
    // Проверяем режим разработки через import.meta.env вместо process.env
    if (import.meta.env.DEV) {
      // Возвращаем мок-данные только в режиме разработки
      console.log('Возвращаем мок-данные для отладки (только в режиме разработки)');
      return getMockDeliveryData();
    }
    
    throw error;
  }
};

/**
 * Функция для проверки работоспособности токена и его обновления
 * Отправляет тестовый запрос к Google Sheets API
 */
export const verifyAndRefreshToken = async (): Promise<boolean> => {
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    console.log('Невозможно проверить токен - токен отсутствует');
    return false;
  }
  
  // Отправляем тестовый запрос для проверки токена
  try {
    console.log('Проверяем работоспособность токена...');
    
    // Используем более простой и надежный URL для проверки токена
    // Запрашиваем список доступных таблиц вместо общего списка
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets?fields=spreadsheets(spreadsheetId,properties.title)', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Токен работает корректно');
      return true;
    } 
    
    const errorText = await response.text();
    console.error('Ошибка при проверке токена:', response.status, errorText);
    
    // Если ошибка 401, токен недействителен - пробуем обновить
    if (response.status === 401 || response.status === 403) {
      console.log('Токен недействителен, пробуем обновить через Firebase...');
      
      // Пытаемся получить новый токен через Firebase
      const refreshSuccess = await refreshFirebaseGoogleToken();
      if (refreshSuccess) {
        console.log('Токен успешно обновлен через Firebase');
        return true;
      }
      
      // Если не удалось обновить, очищаем токен
      console.log('Не удалось обновить токен, очищаем...');
      clearToken();
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return false;
  }
};

/**
 * Функция для обновления токена Google через Firebase
 * Использует Google Provider для получения свежего токена
 */
export const refreshFirebaseGoogleToken = async (): Promise<boolean> => {
  try {
    // Импортируем асинхронно, чтобы избежать циклических зависимостей
    const { loginWithGoogle } = await import('./firebaseConfig');
    
    console.log('Пытаемся обновить токен через Firebase...');
    const { accessToken, refreshToken } = await loginWithGoogle();
    
    if (accessToken) {
      console.log('Получен новый токен от Firebase');
      setAccessToken(accessToken);
      
      if (refreshToken) {
        console.log('Получен refresh token от Firebase');
        setRefreshToken(refreshToken);
      }
      
      return true;
    }
    
    console.error('Не удалось получить новый токен от Firebase');
    return false;
  } catch (error) {
    console.error('Ошибка при обновлении токена через Firebase:', error);
    return false;
  }
};

// Функция для обновления данных в Google Sheets
export const updateDeliveryData = async (
  updatedEvent: DeliveryEvent,
  configId?: string
): Promise<boolean> => {
  try {
    console.log('Обновляем данные в Google Sheets:', updatedEvent);
    
    // Получаем токен доступа OAuth2
    const accessToken = getAccessToken();
    
    // Проверяем наличие и срок действия токена
    if (!accessToken || isTokenExpired()) {
      console.log('Токен отсутствует или истек, пытаемся обновить...');
      
      // Пытаемся получить новый токен через Firebase
      const refreshSuccess = await refreshFirebaseGoogleToken();
      if (!refreshSuccess) {
        // Только сейчас очищаем токен и выдаем ошибку, если не смогли обновить
        clearToken();
        throw new Error('Требуется повторная авторизация OAuth для обновления данных');
      }
    }
    
    // Если не указан configId, пытаемся найти первую доступную конфигурацию
    let actualConfigId: string = '';
    if (!configId) {
      const configs = getAllConfigs();
      if (configs.length > 0) {
        actualConfigId = configs[0].id;
      } else {
        throw new Error('Нет доступных конфигураций Google таблиц');
      }
    } else {
      actualConfigId = configId;
    }
    
    // Получаем конфигурацию
    const config = getConfigById(actualConfigId);
    if (!config) {
      // Если конфигурация не найдена в localStorage, пытаемся получить из Firebase
      try {
        const { getFirebaseConfigById } = await import('./firebaseConfigService');
        const firebaseConfig = await getFirebaseConfigById(actualConfigId);
        
        if (!firebaseConfig) {
          throw new Error(`Конфигурация с ID ${actualConfigId} не найдена ни в localStorage, ни в Firebase`);
        }
        
        // Продолжаем с Firebase конфигурацией...
        return await updateWithConfig(firebaseConfig, updatedEvent, actualConfigId);
      } catch (error) {
        console.error(`Ошибка при получении конфигурации из Firebase:`, error);
        throw new Error(`Конфигурация с ID ${actualConfigId} не найдена`);
      }
    }
    
    // Используем конфигурацию из localStorage
    return await updateWithConfig(config, updatedEvent, actualConfigId);
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    return false;
  }
};

// Вспомогательная функция для обновления данных с конфигурацией
const updateWithConfig = async (
  config: GoogleSheetsConfig,
  updatedEvent: DeliveryEvent,
  configId: string
): Promise<boolean> => {
  try {
    const { spreadsheetId, sheetName } = config;
    const { dateColumn, marketplaceColumn, warehouseColumn, departmentColumn, itemCountColumn, realizationNumberColumn, deliveryNumberColumn, transitWarehouseColumn } = config.columnMappings;
    
    // Получаем индекс строки из ID события, например "delivery-5" -> 5
    let rowIndex = 0;
    // Изменённый регулярный шаблон для извлечения индекса из нового формата ID
    const idMatch = updatedEvent.id.match(/delivery-(\d+)$/);
    if (idMatch && idMatch[1]) {
      rowIndex = parseInt(idMatch[1], 10) + 2; // +2 потому что первая строка - заголовок, и индексация начинается с 0
    } else {
      // Если ID не в ожидаемом формате, сначала получаем все данные и ищем событие
      const allEvents = await fetchDeliveryDataFromConfig(configId);
      const eventIndex = allEvents.findIndex(event => event.id === updatedEvent.id);
      if (eventIndex === -1) {
        throw new Error('Событие не найдено в таблице');
      }
      rowIndex = eventIndex + 2; // +2 потому что первая строка - заголовок
    }
    
    // Преобразуем дату из формата YYYY-MM-DD в ДД.ММ.YYYY для Google Sheets
    let formattedDate = updatedEvent.date;
    if (updatedEvent.date && updatedEvent.date.includes('-')) {
      const [year, month, day] = updatedEvent.date.split('-');
      formattedDate = `${day}.${month}.${year}`;
    }
    
    // Функция для преобразования буквы столбца в индекс массива (A -> 0, B -> 1, ...)
    const colToIndex = (col: string): number => col.charCodeAt(0) - 65;
    
    // Создаем массив маппингов обновляемых ячеек
    const updateData = [
      {
        range: `${sheetName ? sheetName + '!' : ''}${dateColumn}${rowIndex}`,
        values: [[formattedDate]]
      },
      {
        range: `${sheetName ? sheetName + '!' : ''}${marketplaceColumn}${rowIndex}`,
        values: [[updatedEvent.marketplace.toString()]]
      },
      {
        range: `${sheetName ? sheetName + '!' : ''}${warehouseColumn}${rowIndex}`,
        values: [[updatedEvent.warehouse]]
      },
      {
        range: `${sheetName ? sheetName + '!' : ''}${departmentColumn}${rowIndex}`,
        values: [[updatedEvent.department]]
      },
      {
        range: `${sheetName ? sheetName + '!' : ''}${itemCountColumn}${rowIndex}`,
        values: [[String(updatedEvent.itemCount || 0)]]
      },
      {
        range: `${sheetName ? sheetName + '!' : ''}${realizationNumberColumn}${rowIndex}`,
        values: [[updatedEvent.realizationNumber || '']]
      },
      {
        range: `${sheetName ? sheetName + '!' : ''}${deliveryNumberColumn}${rowIndex}`,
        values: [[updatedEvent.deliveryNumber || '']]
      },
      {
        range: `${sheetName ? sheetName + '!' : ''}${transitWarehouseColumn}${rowIndex}`,
        values: [[updatedEvent.transitWarehouse || '']]
      }
    ];
    
    console.log('Обновляемые данные:', JSON.stringify(updateData));
    
    // Используем batchUpdate для обновления только указанных ячеек
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`);
    
    // Получаем токен заново, так как он мог обновиться
    const currentToken = getAccessToken();
    
    // Выполняем запрос с защитой от CORS ошибок
    let response: Response;
    
    try {
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        mode: 'cors',
        credentials: 'same-origin',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: updateData
        })
      });
    } catch (fetchError) {
      console.error('Ошибка при выполнении fetch запроса для обновления данных:', fetchError);
      
      if (fetchError instanceof TypeError || 
          String(fetchError).includes('CORS') || 
          String(fetchError).includes('network')) {
        
        console.warn('Возможно, это CORS ошибка при обновлении данных. Пробуем альтернативный метод...');
        
        // Не очищаем токен при CORS ошибках
        throw new Error(`CORS ошибка при обновлении данных в Google Sheets API. Убедитесь, что домен ${window.location.origin} добавлен в список разрешенных в Google Cloud Console.`);
      }
      
      throw fetchError;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API ответил с ошибкой при обновлении:', response.status, errorText);
      
      // Обработка 401 ошибки - попытка обновить токен
      if (response.status === 401) {
        console.log('Токен недействителен, пробуем обновить...');
        const refreshSuccess = await refreshFirebaseGoogleToken();
        if (refreshSuccess) {
          console.log('Токен обновлен, повторяем запрос на обновление...');
          // Рекурсивно повторяем запрос
          return updateDeliveryData(updatedEvent, configId);
        } else {
          // Только теперь очищаем токен
          clearToken();
          throw new Error('Не удалось обновить токен. Требуется повторная авторизация.');
        }
      }
      
      // Если получили ошибку CORS, НЕ очищаем токен
      if (errorText.includes('CORS') || errorText.includes('Origin') || response.status === 403) {
        console.warn(`CORS или доступ запрещен при обновлении данных. Проверьте настройки в Google Cloud Console.`);
        throw new Error(`Ошибка доступа к Google Sheets API при обновлении данных. Проверьте настройки CORS для домена ${window.location.origin}.`);
      }
      
      throw new Error(`Ошибка при обновлении данных в Google Sheets: ${response.status} ${errorText}`);
    }
    
    console.log('Данные успешно обновлены в Google Sheets');
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    return false;
  }
};

/**
 * Функция для преобразования строкового представления числа в числовое значение
 * Поддерживает форматы: "1000", "1 000", "1 000,00", "1,000.00"
 */
const parseItemCount = (value: string | null | undefined): number => {
  if (!value) return 0;
  
  // Преобразуем значение в строку и проверяем, что оно не пустое
  const stringValue = String(value).trim();
  if (!stringValue) return 0;
  
  try {
    // Удаляем все пробелы
    let cleanValue = stringValue.replace(/\s+/g, '');
    
    // Определяем, какой разделитель используется для десятичной части
    if (cleanValue.includes(',') && cleanValue.includes('.')) {
      // Если есть и точка и запятая, предполагаем, что запятая - разделитель тысяч (1,000.00)
      cleanValue = cleanValue.replace(/,/g, '');
    } else if (cleanValue.includes(',')) {
      // Если есть только запятая, предполагаем, что это десятичный разделитель (1000,00)
      cleanValue = cleanValue.replace(',', '.');
    }
    
    // Преобразуем в число и округляем до целого
    const numValue = parseFloat(cleanValue);
    const result = isNaN(numValue) ? 0 : Math.round(numValue);
    
    console.log(`Преобразование числа: "${value}" -> ${result}`);
    return result;
  } catch (e) {
    console.error(`Не удалось преобразовать "${value}" в число:`, e);
    return 0;
  }
};

/**
 * Трансформация данных из Google Sheets в формат DeliveryEvent
 */
const transformSheetsData = (data: SheetsData, config?: GoogleSheetsConfig): DeliveryEvent[] => {
  if (!data.values || data.values.length === 0) {
    console.log('Нет данных в таблице или данные в неправильном формате');
    return [];
  }
  
  console.log('Получены данные из таблицы:', data.values);
  
  // Функция для преобразования буквы столбца в индекс массива (A -> 0, B -> 1, ...)
  const colToIndex = (col: string): number => col.charCodeAt(0) - 65;
  
  const events: DeliveryEvent[] = [];
  
  data.values.forEach((row, index) => {
    try {
      // Если конфигурация не указана, используем стандартные столбцы
      if (!config) {
        console.log('Конфигурация не указана, используем стандартное расположение столбцов (A-F)');
        const date = row[0]; // A
        const marketplace = row[1]; // B
        const warehouse = row[2]; // C
        const department = row[3]; // D
        const itemCount = row[4]; // E
        const realizationNumber = row[5]; // F
        
        // Пропускаем строки с пустыми значениями
        if (!date || !marketplace) {
          return;
        }
        
        // Стандартная обработка данных...
        // Преобразуем формат даты из ДД.ММ.YYYY в YYYY-MM-DD
        let formattedDate = date;
        if (date && date.includes('.')) {
          const [day, month, year] = date.split('.');
          formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Обработка данных и возврат события...
        events.push({
          id: `default-delivery-${index}`,
          title: `${marketplace || ''}: ${warehouse || ''}`,
          date: formattedDate,
          marketplace: marketplace as any,
          warehouse: warehouse || '',
          department: department || '',
          itemCount: parseItemCount(itemCount),
          realizationNumber: realizationNumber || '',
        });
        return;
      }
      
      // Получаем буквенные обозначения столбцов из конфигурации
      const { dateColumn, marketplaceColumn, warehouseColumn, departmentColumn, itemCountColumn, realizationNumberColumn, deliveryNumberColumn, transitWarehouseColumn } = config.columnMappings;
      
      // Прямое получение данных из соответствующих столбцов по их буквенным обозначениям
      // Преобразуем буквы в индексы массива (A -> 0, B -> 1, ...)
      const dateIdx = colToIndex(dateColumn);
      const marketplaceIdx = colToIndex(marketplaceColumn);
      const warehouseIdx = colToIndex(warehouseColumn);
      const departmentIdx = colToIndex(departmentColumn);
      const itemCountIdx = colToIndex(itemCountColumn);
      const realizationNumberIdx = colToIndex(realizationNumberColumn);
      const deliveryNumberIdx = colToIndex(deliveryNumberColumn);
      const transitWarehouseIdx = colToIndex(transitWarehouseColumn);
      
      console.log(`Столбцы по индексам: Дата=${dateColumn}(${dateIdx}), Маркетплейс=${marketplaceColumn}(${marketplaceIdx}), Склад=${warehouseColumn}(${warehouseIdx}), Подразделение=${departmentColumn}(${departmentIdx}), Количество=${itemCountColumn}(${itemCountIdx}), Номер=${realizationNumberColumn}(${realizationNumberIdx}), Доставка=${deliveryNumberColumn}(${deliveryNumberIdx}), Транзитный=${transitWarehouseColumn}(${transitWarehouseIdx})`);
      
      // Получаем значения из соответствующих столбцов напрямую по индексам
      const date = row[dateIdx];
      const marketplace = row[marketplaceIdx];
      const warehouse = row[warehouseIdx];
      const department = row[departmentIdx];
      const itemCount = row[itemCountIdx];
      const realizationNumber = row[realizationNumberIdx];
      const deliveryNumber = row[deliveryNumberIdx];
      const transitWarehouse = row[transitWarehouseIdx];
      
      // Пропускаем строки, если дата или маркетплейс пустые
      if (!date || !marketplace) {
        return;
      }
      
      // Преобразуем формат даты из ДД.ММ.YYYY в YYYY-MM-DD
      let formattedDate = date;
      if (date && date.includes('.')) {
        const [day, month, year] = date.split('.');
        formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      console.log(`Преобразование даты: ${date} -> ${formattedDate}`);
      console.log(`Маркетплейс: ${marketplace}, тип: ${typeof marketplace}`);
      
      // Создаем HTML для событий с нужной структурой и цветом подразделения
      const departmentColor = getDepartmentColor(department);
      
      // Определяем класс для маркетплейса
      let marketplaceClass = '';
      if (marketplace && typeof marketplace === 'string') {
        const marketplaceLower = marketplace.toString().toLowerCase();
        if (marketplaceLower.includes('wild') || marketplaceLower === 'wb' || marketplaceLower === 'вб') {
          marketplaceClass = 'wildberries';
        } else if (marketplaceLower.includes('ozon')) {
          marketplaceClass = 'ozon';
        } else if (marketplaceLower.includes('яндекс') || marketplaceLower.includes('yandex')) {
          marketplaceClass = 'yandex';
        }
      }
      
      // Нормализуем значение marketplace
      let normalizedMarketplace = marketplace;
      if (marketplace && typeof marketplace === 'string') {
        // Приводим к стандартным названиям
        const lowercaseMarketplace = marketplace.toLowerCase();
        console.log(`Определение маркетплейса для "${lowercaseMarketplace}"`);
        
        // Расширенная проверка для Wildberries
        if (
          lowercaseMarketplace.includes('wild') || 
          lowercaseMarketplace === 'wb' || 
          lowercaseMarketplace === 'вб' ||
          lowercaseMarketplace.includes('вайлдберриз') ||
          lowercaseMarketplace.includes('вб')
        ) {
          normalizedMarketplace = 'Wildberries';
          console.log(`Определен как Wildberries: ${normalizedMarketplace}`);
        } else if (lowercaseMarketplace.includes('ozon')) {
          normalizedMarketplace = 'Ozon';
          console.log(`Определен как Ozon: ${normalizedMarketplace}`);
        } else if (lowercaseMarketplace.includes('яндекс') || lowercaseMarketplace.includes('yandex')) {
          normalizedMarketplace = 'Яндекс.Маркет';
          console.log(`Определен как Яндекс.Маркет: ${normalizedMarketplace}`);
        } else {
          console.log(`Маркетплейс "${lowercaseMarketplace}" не распознан, использую оригинальное значение`);
        }
      }
      
      const eventData: DeliveryEvent = {
        id: `${config?.name || ''}-delivery-${index}`,
        title: `${normalizedMarketplace || ''}: ${warehouse || ''}`,
        date: formattedDate,
        marketplace: normalizedMarketplace as any,
        warehouse: warehouse || '',
        department: department || '',
        itemCount: parseItemCount(itemCount),
        realizationNumber: realizationNumber || '',
        deliveryNumber: deliveryNumber || '',
        transitWarehouse: transitWarehouse || '',
        configId: config?.id,
      };
      
      console.log(`Создано событие: ${JSON.stringify(eventData)}`);
      events.push(eventData);
    } catch (error) {
      console.error(`Ошибка при обработке строки ${index}:`, error);
    }
  });
  
  // Фильтруем результаты, убирая события с пустыми значениями маркетплейса
  const filteredEvents = events.filter(event => {
    // Проверяем наличие значимого значения маркетплейса
    const hasMarketplace = event.marketplace && 
      typeof event.marketplace === 'string' && 
      event.marketplace.trim() !== '';
    
    if (!hasMarketplace) {
      console.log(`Исключено событие ${event.id} из-за отсутствия маркетплейса`);
    }
    
    return hasMarketplace;
  });
  
  console.log(`Всего обработано ${events.length} событий, после фильтрации осталось ${filteredEvents.length}`);
  return filteredEvents;
};

// Mock data for development until API is set up
export const getMockDeliveryData = (): DeliveryEvent[] => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  return [
    {
      id: '1',
      title: 'Ozon: Москва',
      date: today.toISOString().split('T')[0],
      marketplace: 'Ozon',
      warehouse: 'Москва',
      department: 'Электроника',
      itemCount: 250,
    },
    {
      id: '2',
      title: 'Wildberries: Санкт-Петербург',
      date: tomorrow.toISOString().split('T')[0],
      marketplace: 'Wildberries',
      warehouse: 'Санкт-Петербург',
      department: 'Одежда',
      itemCount: 175,
    },
    {
      id: '3',
      title: 'Яндекс.Маркет: Новосибирск',
      date: nextWeek.toISOString().split('T')[0],
      marketplace: 'Яндекс.Маркет',
      warehouse: 'Новосибирск',
      department: 'Бытовая техника',
      itemCount: 120,
    },
  ];
};

// Интервал автообновления данных (в миллисекундах)
const DEFAULT_REFRESH_INTERVAL = 60000; // 1 минута

// Хранение таймера для автообновления
let autoRefreshTimerId: number | null = null;

// Хранение времени для прогресс-бара автообновления
let lastRefreshTime: number | null = null;
let nextRefreshTime: number | null = null;
let currentRefreshInterval: number = DEFAULT_REFRESH_INTERVAL;

/**
 * Получить процент прогресса до следующего обновления (от 0 до 100)
 */
export const getAutoRefreshProgress = (): number => {
  if (!autoRefreshTimerId || !lastRefreshTime || !nextRefreshTime) {
    return 0;
  }
  
  const now = Date.now();
  const elapsed = now - lastRefreshTime;
  const total = nextRefreshTime - lastRefreshTime;
  
  // Возвращаем процент оставшегося времени (инвертированный прогресс)
  return 100 - Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
};

/**
 * Получить время в секундах до следующего обновления
 */
export const getTimeUntilNextRefresh = (): number => {
  if (!autoRefreshTimerId || !nextRefreshTime) {
    return 0;
  }
  
  const now = Date.now();
  const remaining = Math.max(0, nextRefreshTime - now);
  
  return Math.ceil(remaining / 1000);
};

/**
 * Запустить автоматическое обновление данных из Google Sheets
 * @param callback Функция, которая будет вызываться при обновлении данных
 * @param interval Интервал обновления в миллисекундах (по умолчанию 1 минута)
 * @param configIds Массив ID конфигураций для обновления (по умолчанию все доступные)
 */
export const startAutoRefresh = (
  callback: (data: DeliveryEvent[]) => void,
  interval: number = DEFAULT_REFRESH_INTERVAL,
  configIds?: string[]
): void => {
  // Если таймер уже запущен, остановим его
  stopAutoRefresh();
  
  console.log(`[INFO] Запущено автообновление данных с интервалом ${interval / 1000} секунд`);
  
  if (configIds && configIds.length > 0) {
    console.log(`[INFO] Автообновление будет использовать ${configIds.length} выбранных конфигураций:`, configIds);
  } else {
    console.log('[INFO] Автообновление будет использовать все доступные конфигурации');
  }
  
  // Запоминаем интервал обновления для расчетов прогресса
  currentRefreshInterval = interval;
  
  // Устанавливаем время начала и следующего обновления
  lastRefreshTime = Date.now();
  nextRefreshTime = lastRefreshTime + interval;
  
  // Запускаем первое обновление сразу
  (configIds && configIds.length > 0 
    ? fetchDeliveryDataFromMultipleConfigs(configIds)
    : fetchDeliveryData())
    .then(data => callback(data))
    .catch(error => console.error('[ERROR] Ошибка при автообновлении данных:', error));
  
  // Запускаем периодическое обновление
  autoRefreshTimerId = window.setInterval(async () => {
    try {
      console.log('[INFO] Выполняется автообновление данных...');
      
      // Обновляем время последнего обновления и следующего обновления
      lastRefreshTime = Date.now();
      nextRefreshTime = lastRefreshTime + interval;
      
      // Используем переданные configIds, если они указаны
      const data = configIds && configIds.length > 0
        ? await fetchDeliveryDataFromMultipleConfigs(configIds)
        : await fetchDeliveryData();
      
      callback(data);
      console.log(`[INFO] Данные успешно обновлены, получено ${data.length} событий`);
    } catch (error) {
      console.error('[ERROR] Ошибка при автообновлении данных:', error);
    }
  }, interval);
};

/**
 * Остановить автоматическое обновление данных
 */
export const stopAutoRefresh = (): void => {
  if (autoRefreshTimerId !== null) {
    window.clearInterval(autoRefreshTimerId);
    autoRefreshTimerId = null;
    lastRefreshTime = null;
    nextRefreshTime = null;
    console.log('[INFO] Автообновление данных остановлено');
  }
};

/**
 * Проверить, запущено ли автообновление
 */
export const isAutoRefreshActive = (): boolean => {
  return autoRefreshTimerId !== null;
};
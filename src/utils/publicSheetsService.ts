// Альтернативный сервис для работы с публичными Google Sheets
// Обходит ограничения API ключа используя публичный доступ

import { DeliveryEvent, GoogleSheetsConfig } from '../types';
import { getDepartmentColor } from './colorMap';

/**
 * Получение данных из публичной Google таблицы без API ключа
 */
export const fetchPublicSheetsData = async (
  spreadsheetId: string, 
  sheetName: string
): Promise<DeliveryEvent[]> => {
  try {
    console.log(`[PUBLIC] Загружаем данные из публичной таблицы: ${spreadsheetId}, лист: ${sheetName}`);
    
    // Используем публичный CSV export
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    
    console.log(`[PUBLIC] CSV URL: ${csvUrl}`);
    
    const response = await fetch(csvUrl, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log(`[PUBLIC] Получен CSV размером: ${csvText.length} символов`);

    // Парсим CSV в события календаря
    const events = parseCSVToEvents(csvText, sheetName);
    console.log(`[PUBLIC] Обработано событий: ${events.length}`);

    return events;
  } catch (error) {
    console.error(`[PUBLIC] Ошибка загрузки публичной таблицы:`, error);
    throw error;
  }
};

/**
 * Парсинг CSV в события календаря
 */
function parseCSVToEvents(csvText: string, sheetName: string): DeliveryEvent[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) {
    console.warn('[PUBLIC] CSV содержит менее 2 строк');
    return [];
  }

  // Первая строка - заголовки
  const headers = parseCSVLine(lines[0]);
  console.log('[PUBLIC] Заголовки CSV:', headers);

  const events: DeliveryEvent[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      const event = parseRowToEvent(headers, values, sheetName, i + 1);
      if (event) {
        events.push(event);
      }
    } catch (error) {
      console.warn(`[PUBLIC] Ошибка парсинга строки ${i + 1}:`, error);
    }
  }

  return events;
}

/**
 * Парсинг строки CSV с учетом кавычек
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Экранированная кавычка
        current += '"';
        i++; // Пропускаем следующую кавычку
      } else {
        // Открывающая или закрывающая кавычка
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Разделитель вне кавычек
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Преобразование строки данных в событие календаря
 */
function parseRowToEvent(
  headers: string[], 
  values: string[], 
  sheetName: string, 
  rowIndex: number
): DeliveryEvent | null {
  try {
    // Ищем колонки по заголовкам (гибкий поиск)
    const dateIndex = findColumnIndex(headers, ['дата', 'date', 'день']);
    const itemCountIndex = findColumnIndex(headers, ['количество', 'кол-во', 'count', 'amount']);
    const departmentIndex = findColumnIndex(headers, ['отдел', 'department', 'категория']);
    
    if (dateIndex === -1) {
      console.warn(`[PUBLIC] Не найдена колонка с датой в строке ${rowIndex}`);
      return null;
    }

    const dateStr = values[dateIndex]?.trim();
    if (!dateStr) {
      return null;
    }

    // Парсим дату
    const date = parseDate(dateStr);
    if (!date) {
      console.warn(`[PUBLIC] Не удалось распарсить дату "${dateStr}" в строке ${rowIndex}`);
      return null;
    }

    // Получаем количество
    const itemCount = itemCountIndex !== -1 ? 
      parseInt(values[itemCountIndex]?.replace(/\D/g, '') || '0') : 1;

    // Получаем отдел/категорию
    const department = departmentIndex !== -1 ? 
      values[departmentIndex]?.trim() || 'Общий' : 'Общий';

    const event: DeliveryEvent = {
      id: `public-${sheetName}-${rowIndex}-${Date.now()}`,
      title: `${department} (${itemCount})`,
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      marketplace: 'Wildberries' as const,
      warehouse: sheetName,
      department: department,
      itemCount: itemCount
    };

    return event;
  } catch (error) {
    console.error(`[PUBLIC] Ошибка создания события из строки ${rowIndex}:`, error);
    return null;
  }
}

/**
 * Поиск индекса колонки по возможным названиям
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(header => 
      header.toLowerCase().includes(name.toLowerCase())
    );
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * Парсинг даты из различных форматов
 */
function parseDate(dateStr: string): Date | null {
  // Удаляем лишние пробелы и кавычки
  const cleaned = dateStr.replace(/['"]/g, '').trim();
  
  // Пробуем различные форматы
  const formats = [
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      let day, month, year;
      
      if (format === formats[3]) {
        // YYYY-MM-DD формат
        [, year, month, day] = match;
      } else {
        // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY форматы
        [, day, month, year] = match;
      }

      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Если ничего не подошло, пробуем стандартный парсинг
  const date = new Date(cleaned);
  return !isNaN(date.getTime()) ? date : null;
}

/**
 * Проверка, является ли таблица публичной
 */
export const checkIfSheetIsPublic = async (spreadsheetId: string): Promise<boolean> => {
  try {
    const testUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
    const response = await fetch(testUrl, { method: 'HEAD', mode: 'no-cors' });
    return true; // Если запрос прошел без ошибки
  } catch {
    return false;
  }
};

/**
 * Получить список листов из публичной таблицы
 */
export const getPublicSheetNames = async (spreadsheetId: string): Promise<string[]> => {
  try {
    // Это упрощенная версия, в реальности нужно было бы парсить HTML страницы Google Sheets
    // Пока возвращаем стандартные названия
    return ['Лист1', 'Sheet1'];
  } catch (error) {
    console.error('[PUBLIC] Ошибка получения списка листов:', error);
    return [];
  }
}; 
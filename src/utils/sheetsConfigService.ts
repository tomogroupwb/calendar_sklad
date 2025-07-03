import { GoogleSheetsConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Ключ для хранения конфигураций в localStorage
const STORAGE_KEY = 'google_sheets_configs';

/**
 * Получить все конфигурации Google таблиц
 */
export const getAllConfigs = (): GoogleSheetsConfig[] => {
  const configsJson = localStorage.getItem(STORAGE_KEY);
  if (!configsJson) return [];
  
  try {
    return JSON.parse(configsJson);
  } catch (error) {
    console.error('Ошибка при парсинге конфигураций:', error);
    return [];
  }
};

/**
 * Получить конфигурацию по ID
 */
export const getConfigById = (id: string): GoogleSheetsConfig | undefined => {
  const configs = getAllConfigs();
  return configs.find(config => config.id === id);
};

/**
 * Добавить новую конфигурацию
 */
export const addConfig = (config: Omit<GoogleSheetsConfig, 'id'>): GoogleSheetsConfig => {
  const newConfig: GoogleSheetsConfig = {
    ...config,
    id: uuidv4() // Генерируем уникальный ID
  };
  
  const configs = getAllConfigs();
  configs.push(newConfig);
  saveConfigs(configs);
  
  return newConfig;
};

/**
 * Обновить существующую конфигурацию
 */
export const updateConfig = (config: GoogleSheetsConfig): boolean => {
  const configs = getAllConfigs();
  const index = configs.findIndex(c => c.id === config.id);
  
  if (index === -1) return false;
  
  configs[index] = config;
  saveConfigs(configs);
  
  return true;
};

/**
 * Удалить конфигурацию по ID
 */
export const deleteConfig = (id: string): boolean => {
  const configs = getAllConfigs();
  const filteredConfigs = configs.filter(config => config.id !== id);
  
  if (filteredConfigs.length === configs.length) return false;
  
  saveConfigs(filteredConfigs);
  return true;
};

/**
 * Сохранить конфигурации в localStorage
 */
const saveConfigs = (configs: GoogleSheetsConfig[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}; 
import React, { useState, useEffect, useContext } from 'react';
import { GoogleSheetsConfig, AuthState } from '../../types';
import { 
  getAllConfigs, 
  addConfig, 
  updateConfig, 
  deleteConfig 
} from '../../utils/sheetsConfigService';
import {
  getAllFirebaseConfigs,
  addFirebaseConfig,
  updateFirebaseConfig,
  deleteFirebaseConfig
} from '../../utils/firebaseConfigService';

// Создаем контекст для доступа к состоянию аутентификации
const AuthContext = React.createContext<AuthState>({
  isLoggedIn: false,
  user: null,
  authProvider: null
});

// Экспортируем провайдер контекста для использования в основном компоненте
export const AuthProvider = ({ children, value }: { children: React.ReactNode, value: AuthState }) => (
  <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
);

interface ConfigPageProps {
  onLoadFromConfigs: (configIds: string[]) => Promise<void>;
  onBack: () => void;
}

const ConfigPage: React.FC<ConfigPageProps> = ({ onLoadFromConfigs, onBack }) => {
  const authState = useContext(AuthContext);
  const [configs, setConfigs] = useState<GoogleSheetsConfig[]>([]);
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Форма для добавления/редактирования
  const [formData, setFormData] = useState<Omit<GoogleSheetsConfig, 'id'>>({
    name: '',
    spreadsheetId: '',
    sheetName: 'Лист1',
    columnMappings: {
      dateColumn: 'A',
      marketplaceColumn: 'B',
      warehouseColumn: 'C',
      departmentColumn: 'D',
      itemCountColumn: 'E',
      realizationNumberColumn: 'F',
      deliveryNumberColumn: 'G',
      transitWarehouseColumn: 'H'
    }
  });
  
  useEffect(() => {
    // Загружаем конфигурации при первом рендере и при изменении authState
    const loadConfigs = async () => {
      setLoading(true);
      
      try {
        let loadedConfigs: GoogleSheetsConfig[] = [];
        
        if (authState.authProvider === 'google') {
          // Загружаем из localStorage
          loadedConfigs = getAllConfigs();
                 } else if (authState.authProvider === 'firebase' && authState.user && 'uid' in authState.user && authState.user.uid) {
           // Загружаем из Firebase
           loadedConfigs = await getAllFirebaseConfigs(authState.user.uid);
        }
        
        setConfigs(loadedConfigs);
        
        // По умолчанию выбираем все конфигурации
        if (loadedConfigs.length > 0) {
          setSelectedConfigIds(loadedConfigs.map(config => config.id));
        }
      } catch (err) {
        console.error('Ошибка при загрузке конфигураций:', err);
        setError('Не удалось загрузить конфигурации');
      } finally {
        setLoading(false);
      }
    };
    
    loadConfigs();
  }, [authState]);
  
  const toggleSelectConfig = (configId: string) => {
    setSelectedConfigIds(prev => {
      if (prev.includes(configId)) {
        return prev.filter(id => id !== configId);
      } else {
        return [...prev, configId];
      }
    });
  };
  
  const handleSelectAll = () => {
    if (configs.length === selectedConfigIds.length) {
      // Если все выбраны, снимаем выбор со всех
      setSelectedConfigIds([]);
    } else {
      // Иначе выбираем все
      setSelectedConfigIds(configs.map(config => config.id));
    }
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Обработка вложенных полей, например columnMappings.dateColumn
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Очищаем ошибку для измененного поля
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name) errors.name = 'Укажите название';
    if (!formData.spreadsheetId) errors.spreadsheetId = 'Укажите ID таблицы';
    if (!formData.sheetName) errors.sheetName = 'Укажите название листа';
    
    const columnMappingFields = [
      'dateColumn', 
      'marketplaceColumn', 
      'warehouseColumn', 
      'departmentColumn', 
      'itemCountColumn',
      'realizationNumberColumn',
      'deliveryNumberColumn',
      'transitWarehouseColumn'
    ];
    
    // Проверяем, что все колонки заполнены и в корректном формате
    for (const field of columnMappingFields) {
      const columnLetter = formData.columnMappings[field as keyof typeof formData.columnMappings];
      if (!columnLetter) {
        errors[`columnMappings.${field}`] = 'Укажите букву столбца';
      } else if (!/^[A-Z]$/.test(columnLetter)) {
        errors[`columnMappings.${field}`] = 'Укажите одну заглавную букву (A-Z)';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (authState.authProvider === 'google') {
        // Сохраняем в localStorage
        if (isEditing) {
          // Обновляем существующую конфигурацию
          updateConfig({
            ...formData,
            id: isEditing
          });
          
          setConfigs(prev => prev.map(config => 
            config.id === isEditing ? { ...formData, id: isEditing } : config
          ));
        } else {
          // Добавляем новую конфигурацию
          const newConfig = addConfig(formData);
          setConfigs(prev => [...prev, newConfig]);
          setSelectedConfigIds(prev => [...prev, newConfig.id]);
        }
             } else if (authState.authProvider === 'firebase' && authState.user && 'uid' in authState.user && authState.user.uid) {
         // Сохраняем в Firebase
         if (isEditing) {
           // Обновляем существующую конфигурацию
           await updateFirebaseConfig({
             ...formData,
             id: isEditing
           });
           
           setConfigs(prev => prev.map(config => 
             config.id === isEditing ? { ...formData, id: isEditing } : config
           ));
         } else {
           // Добавляем новую конфигурацию
           const newConfig = await addFirebaseConfig(formData, authState.user.uid);
           if (newConfig) {
             setConfigs(prev => [...prev, newConfig]);
             setSelectedConfigIds(prev => [...prev, newConfig.id]);
           }
         }
      }
      
      // Сбрасываем форму
      resetForm();
    } catch (err) {
      console.error('Ошибка при сохранении конфигурации:', err);
      setError('Не удалось сохранить конфигурацию');
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      spreadsheetId: '',
      sheetName: 'Лист1',
      columnMappings: {
        dateColumn: 'A',
        marketplaceColumn: 'B',
        warehouseColumn: 'C',
        departmentColumn: 'D',
        itemCountColumn: 'E',
        realizationNumberColumn: 'F',
        deliveryNumberColumn: 'G',
        transitWarehouseColumn: 'H'
      }
    });
    setFormErrors({});
    setIsAddingNew(false);
    setIsEditing(null);
  };
  
  const handleEdit = (config: GoogleSheetsConfig) => {
    setFormData({
      name: config.name,
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
      columnMappings: { ...config.columnMappings }
    });
    setIsEditing(config.id);
    setIsAddingNew(true);
  };
  
  const handleDelete = async (configId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту конфигурацию?')) {
      setLoading(true);
      
      try {
        let isDeleted = false;
        
        if (authState.authProvider === 'google') {
          // Удаляем из localStorage
          isDeleted = deleteConfig(configId);
        } else if (authState.authProvider === 'firebase') {
          // Удаляем из Firebase
          isDeleted = await deleteFirebaseConfig(configId);
        }
        
        if (isDeleted) {
          setConfigs(prev => prev.filter(config => config.id !== configId));
          setSelectedConfigIds(prev => prev.filter(id => id !== configId));
        }
      } catch (err) {
        console.error('Ошибка при удалении конфигурации:', err);
        setError('Не удалось удалить конфигурацию');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleLoadSelected = async () => {
    if (selectedConfigIds.length === 0) {
      setError('Выберите хотя бы одну конфигурацию');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await onLoadFromConfigs(selectedConfigIds);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setError('Не удалось загрузить данные. Проверьте корректность конфигураций и ваши права доступа к таблицам.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white shadow-card rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Управление Google таблицами</h2>
        <div className="space-x-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200"
          >
            Назад к календарю
          </button>
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Добавить таблицу
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Форма добавления/редактирования конфигурации */}
      {isAddingNew && (
        <div className="mb-6 p-4 border border-neutral-200 rounded-md">
          <h3 className="text-lg font-medium mb-4">
            {isEditing ? 'Редактировать таблицу' : 'Добавить новую таблицу'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Название (для отображения)
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className={`w-full p-2 border ${formErrors.name ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                placeholder="Например: Поставки Ozon"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                ID таблицы Google
              </label>
              <input
                type="text"
                name="spreadsheetId"
                value={formData.spreadsheetId}
                onChange={handleFormChange}
                className={`w-full p-2 border ${formErrors.spreadsheetId ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                placeholder="Например: 1gDKsS3WE1k0hecMzwr55IMZnK3ApMoaXzCdr6NhXKUo"
              />
              {formErrors.spreadsheetId && (
                <p className="mt-1 text-sm text-red-600">{formErrors.spreadsheetId}</p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                ID находится в URL таблицы между /d/ и /edit
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Название листа
              </label>
              <input
                type="text"
                name="sheetName"
                value={formData.sheetName}
                onChange={handleFormChange}
                className={`w-full p-2 border ${formErrors.sheetName ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                placeholder="Например: Лист1"
              />
              {formErrors.sheetName && (
                <p className="mt-1 text-sm text-red-600">{formErrors.sheetName}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <h4 className="col-span-2 text-md font-medium">Буквенные обозначения столбцов:</h4>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Дата поставки
                </label>
                <input
                  type="text"
                  name="columnMappings.dateColumn"
                  value={formData.columnMappings.dateColumn}
                  onChange={handleFormChange}
                  className={`w-full p-2 border ${formErrors['columnMappings.dateColumn'] ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                  placeholder="A"
                  maxLength={1}
                />
                {formErrors['columnMappings.dateColumn'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['columnMappings.dateColumn']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Маркетплейс
                </label>
                <input
                  type="text"
                  name="columnMappings.marketplaceColumn"
                  value={formData.columnMappings.marketplaceColumn}
                  onChange={handleFormChange}
                  className={`w-full p-2 border ${formErrors['columnMappings.marketplaceColumn'] ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                  placeholder="B"
                  maxLength={1}
                />
                {formErrors['columnMappings.marketplaceColumn'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['columnMappings.marketplaceColumn']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Склад
                </label>
                <input
                  type="text"
                  name="columnMappings.warehouseColumn"
                  value={formData.columnMappings.warehouseColumn}
                  onChange={handleFormChange}
                  className={`w-full p-2 border ${formErrors['columnMappings.warehouseColumn'] ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                  placeholder="C"
                  maxLength={1}
                />
                {formErrors['columnMappings.warehouseColumn'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['columnMappings.warehouseColumn']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Подразделение
                </label>
                <input
                  type="text"
                  name="columnMappings.departmentColumn"
                  value={formData.columnMappings.departmentColumn}
                  onChange={handleFormChange}
                  className={`w-full p-2 border ${formErrors['columnMappings.departmentColumn'] ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                  placeholder="D"
                  maxLength={1}
                />
                {formErrors['columnMappings.departmentColumn'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['columnMappings.departmentColumn']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Количество товаров
                </label>
                <input
                  type="text"
                  name="columnMappings.itemCountColumn"
                  value={formData.columnMappings.itemCountColumn}
                  onChange={handleFormChange}
                  className={`w-full p-2 border ${formErrors['columnMappings.itemCountColumn'] ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                  placeholder="E"
                  maxLength={1}
                />
                {formErrors['columnMappings.itemCountColumn'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['columnMappings.itemCountColumn']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Номер реализации
                </label>
                <input
                  type="text"
                  name="columnMappings.realizationNumberColumn"
                  value={formData.columnMappings.realizationNumberColumn}
                  onChange={handleFormChange}
                  className={`w-full p-2 border ${formErrors['columnMappings.realizationNumberColumn'] ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                  placeholder="F"
                  maxLength={1}
                />
                {formErrors['columnMappings.realizationNumberColumn'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['columnMappings.realizationNumberColumn']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Номер поставки
                </label>
                <input
                  type="text"
                  name="columnMappings.deliveryNumberColumn"
                  value={formData.columnMappings.deliveryNumberColumn}
                  onChange={handleFormChange}
                  className={`w-full p-2 border ${formErrors['columnMappings.deliveryNumberColumn'] ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                  placeholder="G"
                  maxLength={1}
                />
                {formErrors['columnMappings.deliveryNumberColumn'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['columnMappings.deliveryNumberColumn']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Транзитный склад
                </label>
                <input
                  type="text"
                  name="columnMappings.transitWarehouseColumn"
                  value={formData.columnMappings.transitWarehouseColumn}
                  onChange={handleFormChange}
                  className={`w-full p-2 border ${formErrors['columnMappings.transitWarehouseColumn'] ? 'border-red-500' : 'border-neutral-300'} rounded-md`}
                  placeholder="H"
                  maxLength={1}
                />
                {formErrors['columnMappings.transitWarehouseColumn'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['columnMappings.transitWarehouseColumn']}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={loading}
              >
                {isEditing ? 'Сохранить изменения' : 'Добавить таблицу'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Список существующих конфигураций */}
      {configs.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Доступные таблицы</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1 text-xs text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200"
              >
                {configs.length === selectedConfigIds.length ? 'Снять все отметки' : 'Выбрать все'}
              </button>
              <button
                type="button"
                onClick={handleLoadSelected}
                disabled={selectedConfigIds.length === 0 || loading}
                className="px-3 py-1 text-xs text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Загрузить выбранные
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {configs.map(config => (
              <div key={config.id} className="border border-neutral-200 rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedConfigIds.includes(config.id)}
                      onChange={() => toggleSelectConfig(config.id)}
                      className="mt-1"
                    />
                    <div>
                      <h4 className="font-medium">{config.name}</h4>
                      <p className="text-sm text-neutral-600">
                        Таблица: {config.spreadsheetId.substring(0, 10)}...
                      </p>
                      <p className="text-sm text-neutral-600">
                        Лист: {config.sheetName}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(config)}
                      className="px-3 py-1 text-xs text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(config.id)}
                      className="px-3 py-1 text-xs text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500">
          {loading ? (
            <p>Загрузка конфигураций...</p>
          ) : (
            <p>У вас нет сохраненных конфигураций. Нажмите "Добавить таблицу", чтобы создать первую.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfigPage; 
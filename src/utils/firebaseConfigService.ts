import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { GoogleSheetsConfig } from '../types';

// Константа для имени коллекции
const COLLECTION_NAME = 'google_sheets_configs';

/**
 * Получить все конфигурации пользователя
 * @param userId ID пользователя
 */
export const getAllFirebaseConfigs = async (userId: string): Promise<GoogleSheetsConfig[]> => {
  console.log(`[DEBUG] Запрос всех конфигураций для userId: ${userId}`);
  
  try {
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
    console.log(`[DEBUG] Выполняем запрос к коллекции ${COLLECTION_NAME} с фильтром по userId`);
    
    const querySnapshot = await getDocs(q);
    console.log(`[DEBUG] Получено документов: ${querySnapshot.docs.length}`);
    
    const configs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`[DEBUG] Данные документа: ${doc.id}`, data);
      return {
        ...data as Omit<GoogleSheetsConfig, 'id'>,
        id: doc.id
      };
    });
    
    console.log(`[DEBUG] Итоговый список конфигураций:`, configs);
    return configs;
  } catch (error) {
    console.error('[ERROR] Ошибка при получении конфигураций из Firebase:', error);
    return [];
  }
};

/**
 * Получить конфигурацию по ID
 * @param configId ID конфигурации
 */
export const getFirebaseConfigById = async (configId: string): Promise<GoogleSheetsConfig | null> => {
  console.log(`[DEBUG] Запрос конфигурации по ID: ${configId}`);
  
  try {
    const docRef = doc(db, COLLECTION_NAME, configId);
    console.log(`[DEBUG] Обращение к документу в коллекции ${COLLECTION_NAME}`);
    
    const docSnap = await getDoc(docRef);
    console.log(`[DEBUG] Документ существует: ${docSnap.exists()}`);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log(`[DEBUG] Данные документа:`, data);
      
      return {
        ...data as Omit<GoogleSheetsConfig, 'id'>,
        id: docSnap.id
      };
    }
    
    console.log(`[DEBUG] Документ с ID ${configId} не найден`);
    return null;
  } catch (error) {
    console.error('[ERROR] Ошибка при получении конфигурации из Firebase:', error);
    return null;
  }
};

/**
 * Добавить новую конфигурацию
 * @param config Конфигурация для добавления
 * @param userId ID пользователя
 */
export const addFirebaseConfig = async (
  config: Omit<GoogleSheetsConfig, 'id'>, 
  userId: string
): Promise<GoogleSheetsConfig | null> => {
  try {
    const configWithUser = {
      ...config,
      userId
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), configWithUser);
    
    return {
      ...config,
      id: docRef.id
    };
  } catch (error) {
    console.error('Ошибка при добавлении конфигурации в Firebase:', error);
    return null;
  }
};

/**
 * Обновить существующую конфигурацию
 * @param config Конфигурация для обновления
 */
export const updateFirebaseConfig = async (config: GoogleSheetsConfig): Promise<boolean> => {
  try {
    const { id, ...configData } = config;
    const docRef = doc(db, COLLECTION_NAME, id);
    
    await updateDoc(docRef, configData);
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении конфигурации в Firebase:', error);
    return false;
  }
};

/**
 * Удалить конфигурацию по ID
 * @param configId ID конфигурации
 */
export const deleteFirebaseConfig = async (configId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, configId));
    return true;
  } catch (error) {
    console.error('Ошибка при удалении конфигурации из Firebase:', error);
    return false;
  }
}; 
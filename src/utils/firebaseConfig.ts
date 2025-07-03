import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, UserCredential, GoogleAuthProvider, signInWithPopup, OAuthCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Расширяем тип OAuthCredential для доступа к refreshToken
interface ExtendedOAuthCredential extends OAuthCredential {
  refreshToken?: string;
}

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Создаем провайдер Google
const googleProvider = new GoogleAuthProvider();
// Добавляем scope для доступа к Google Sheets API с полными правами
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
// Для опционального чтения (на случай, если не сработает полный доступ)
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
// Добавляем доступ к пользовательской информации
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Добавляем дополнительные параметры для получения refresh токена и принудительного подтверждения
googleProvider.setCustomParameters({
  // Запрос на доступ оффлайн (критично для получения refresh token)
  access_type: 'offline',
  // Принудительное отображение экрана согласия, чтобы обновить токены
  prompt: 'consent',
  // Включить все доступные scopes для Google API
  include_granted_scopes: 'true'
});

// Функция для входа через Google
export const loginWithGoogle = async (): Promise<{user: any, accessToken: string | null, refreshToken: string | null}> => {
  console.log('Начинаем процесс входа через Firebase Google Auth...');
  console.log('Current domain:', window.location.hostname);
  console.log('Firebase config:', {
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
  });
  
  try {
    // Проверяем, есть ли уже вошедший пользователь
    const currentUser = auth.currentUser;
    
    // Запрашиваем всплывающее окно для входа только если нет текущего пользователя
    // или для принудительного обновления токена
    console.log('Запускаем авторизацию через Firebase с Google провайдером...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Успешная авторизация через Firebase, получаем учетные данные...');
    
    // Получаем учетные данные OAuth от GoogleAuthProvider
    const credential = GoogleAuthProvider.credentialFromResult(result) as ExtendedOAuthCredential;
    
    console.log('Проверка учетных данных:', {
      hasCredential: !!credential,
      hasAccessToken: !!credential?.accessToken,
      accessTokenLength: credential?.accessToken ? credential.accessToken.length : 0,
      tokenSubstring: credential?.accessToken ? credential.accessToken.substring(0, 10) + '...' : 'отсутствует'
    });
    
    const accessToken = credential?.accessToken || null;
    // Получаем refresh token, если доступен
    const refreshToken = credential?.refreshToken || null;
    
    console.log('Проверка refresh токена:', {
      hasRefreshToken: !!refreshToken,
      refreshTokenLength: refreshToken ? refreshToken.length : 0,
      refreshTokenSubstring: refreshToken ? refreshToken.substring(0, 10) + '...' : 'отсутствует'
    });
    
    if (!accessToken) {
      console.warn('Firebase не предоставил токен доступа к Google API. Проверьте настройки Firebase и Google OAuth.');
      
      // Попытка получить токен через переаутентификацию
      console.log('Пробуем повторно аутентифицироваться для получения токена...');
      const user = auth.currentUser;
      if (user) {
        try {
          const provider = new GoogleAuthProvider();
          provider.addScope('https://www.googleapis.com/auth/spreadsheets');
          provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
          provider.addScope('https://www.googleapis.com/auth/userinfo.email');
          provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
          provider.setCustomParameters({
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true'
          });
          
          const reauthResult = await signInWithPopup(auth, provider);
          const reauthCredential = GoogleAuthProvider.credentialFromResult(reauthResult) as ExtendedOAuthCredential;
          const reauthToken = reauthCredential?.accessToken || null;
          const reauthRefreshToken = reauthCredential?.refreshToken || null;
          
          if (reauthToken) {
            console.log('Успешно получен токен через повторную аутентификацию');
            return { user: reauthResult.user, accessToken: reauthToken, refreshToken: reauthRefreshToken };
          }
        } catch (reauthError) {
          console.error('Ошибка при повторной аутентификации:', reauthError);
        }
      }
    }
    
    return { user: result.user, accessToken, refreshToken };
  } catch (error) {
    console.error('Ошибка при входе через Firebase Google Auth:', error);
    throw error;
  }
};

// Функция для входа с помощью электронной почты и пароля
export const loginWithEmailAndPassword = async (
  email: string, 
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Функция для регистрации нового пользователя
export const registerWithEmailAndPassword = async (
  email: string, 
  password: string
): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// Функция выхода из системы
export const logout = async (): Promise<void> => {
  return signOut(auth);
};

// Вспомогательная функция для проверки инициализации Firebase
export const isFirebaseInitialized = (): boolean => {
  return !!app;
}; 
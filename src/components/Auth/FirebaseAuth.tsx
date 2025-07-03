import React from 'react';
import { LogIn } from 'lucide-react';
import { loginWithGoogle } from '../../utils/firebaseConfig';
import { setAccessToken, verifyAndRefreshToken } from '../../utils/googleSheetsService';

interface FirebaseAuthProps {
  onLoginSuccess: (user: any) => void;
  onLoginFailure: (error: any) => void;
}

const FirebaseAuth: React.FC<FirebaseAuthProps> = ({ onLoginSuccess, onLoginFailure }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Запускаем авторизацию через Firebase Google...');
      const { user, accessToken } = await loginWithGoogle();
      
      // Сохраняем токен для Google Sheets API
      if (accessToken) {
        console.log('Получен access token от Firebase Auth:', accessToken.substring(0, 10) + '...');
        // Сохраняем токен и обновляем метку времени
        setAccessToken(accessToken);
        
        // Проверяем валидность токена сразу после получения
        try {
          console.log('Проверяем валидность полученного токена...');
          const isValid = await verifyAndRefreshToken();
          if (!isValid) {
            console.warn('Токен получен, но не может быть использован для доступа к Google Sheets API. Проверьте настройки проекта в Google Cloud Console.');
            // Сообщаем пользователю о проблеме
            setError('Авторизация в Firebase успешна, но доступ к Google Sheets не удалось получить. Проверьте настройки CORS и разрешения API в Google Cloud Console.');
          } else {
            console.log('Токен получен и валиден, успешная авторизация.');
          }
        } catch (tokenError) {
          console.error('Ошибка при проверке токена:', tokenError);
          setError('Ошибка при проверке доступа к Google Sheets. Возможно, проблема с CORS или настройками API.');
        }
      } else {
        console.warn('Google Access Token не был получен от Firebase. Проверьте настройки Firebase авторизации и scopes.');
        setError('Не удалось получить токен для доступа к Google API. Возможно, отсутствуют необходимые разрешения в Firebase.');
      }
      
      // Сообщаем об успешной авторизации даже при проблемах с токеном,
      // поскольку вход в Firebase был успешным
      onLoginSuccess(user);
    } catch (error: any) {
      console.error('Ошибка Firebase Google Auth:', error);
      
      let errorMessage = 'Произошла ошибка при аутентификации через Google';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Вход отменен пользователем';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Запрос был отменен';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Домен не авторизован. Добавьте текущий домен в консоли Firebase.';
      } else if (error.code) {
        errorMessage = `Ошибка авторизации: ${error.code}`;
      }
      
      setError(errorMessage);
      onLoginFailure(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4">
      {error && (
        <div className="text-red-500 text-sm mb-3">{error}</div>
      )}
      
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 w-full bg-red-500 text-white rounded-lg px-4 py-2 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <LogIn className="w-5 h-5" />
        <span>{isLoading ? 'Выполняется вход...' : 'Войти через Google в Firebase'}</span>
      </button>
    </div>
  );
};

export default FirebaseAuth; 
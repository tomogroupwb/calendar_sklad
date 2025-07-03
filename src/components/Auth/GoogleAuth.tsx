import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { LogIn } from 'lucide-react';
import { setAccessToken } from '../../utils/googleSheetsService';

interface GoogleAuthProps {
  onLoginSuccess: (response: any) => void;
  onLoginFailure: (error: any) => void;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onLoginSuccess, onLoginFailure }) => {
  // Используем standard flow (implicit)
  const login = useGoogleLogin({
    onSuccess: (tokenResponse: any) => {
      console.log('Успешная авторизация:', tokenResponse);
      
      // Сохраняем токен доступа
      if (tokenResponse.access_token) {
        setAccessToken(tokenResponse.access_token);
      }
      
      onLoginSuccess(tokenResponse);
    },
    onError: (error) => {
      console.error('Детальная ошибка авторизации:', error);
      onLoginFailure(error);
    },
    scope: 'email profile https://www.googleapis.com/auth/spreadsheets',
  });

  const handleLogin = () => {
    console.log('Начинаем процесс авторизации...', {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
    });
    login();
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center justify-center gap-2 bg-white border border-neutral-300 rounded-lg px-4 py-2 text-neutral-800 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <LogIn className="w-5 h-5" />
      <span>Войти с Google</span>
    </button>
  );
};

export default GoogleAuth;
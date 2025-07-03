import React, { useState } from 'react';
import GoogleAuth from './GoogleAuth';
import FirebaseAuth from './FirebaseAuth';

interface AuthSelectorProps {
  onLoginSuccess: (user: any) => void;
  onLoginFailure: (error: any) => void;
}

const AuthSelector: React.FC<AuthSelectorProps> = ({ onLoginSuccess, onLoginFailure }) => {
  const [authMethod, setAuthMethod] = useState<'google' | 'firebase'>('google');

  return (
    <div className="bg-white shadow-card rounded-lg p-4 sm:p-8 max-w-md w-full">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-center">Добро пожаловать</h2>
      
      <div className="mb-4">
        <div className="flex rounded-md shadow-sm mb-6">
          <button
            type="button"
            onClick={() => setAuthMethod('google')}
            className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
              authMethod === 'google'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-50'
            } border border-neutral-300 rounded-l-md focus:outline-none`}
          >
            Google (локально)
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('firebase')}
            className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
              authMethod === 'firebase'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-50'
            } border border-neutral-300 rounded-r-md focus:outline-none`}
          >
            Google (Firebase)
          </button>
        </div>
      </div>
      
      {authMethod === 'google' ? (
        <div className="text-center">
          <p className="text-neutral-600 mb-4 sm:mb-8">
            Войдите с помощью аккаунта Google для работы с локальными конфигурациями.
          </p>
          <GoogleAuth onLoginSuccess={onLoginSuccess} onLoginFailure={onLoginFailure} />
        </div>
      ) : (
        <div>
          <p className="text-neutral-600 mb-4">
            Войдите с помощью Google через Firebase для сохранения конфигураций в облаке.
          </p>
          <FirebaseAuth onLoginSuccess={onLoginSuccess} onLoginFailure={onLoginFailure} />
        </div>
      )}
    </div>
  );
};

export default AuthSelector; 
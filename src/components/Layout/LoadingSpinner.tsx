import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ozon"></div>
      <span className="sr-only">Загрузка...</span>
    </div>
  );
};

export default LoadingSpinner;
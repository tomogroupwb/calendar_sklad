// check-env.js
// Скрипт для проверки наличия всех необходимых переменных окружения перед сборкой
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Загружаем переменные из .env файла
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✓ Файл .env найден и загружен');
} else {
  console.warn('⚠ Файл .env не найден, используются только системные переменные окружения');
}

// Список обязательных переменных окружения
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_GOOGLE_CLIENT_ID',
  'VITE_GOOGLE_SHEETS_API_KEY'
];

// Проверяем наличие всех необходимых переменных
let missingVars = [];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
}

// Если есть отсутствующие переменные, выводим предупреждение
if (missingVars.length > 0) {
  console.warn('\x1b[33m%s\x1b[0m', 'Предупреждение: следующие переменные окружения не установлены:');
  for (const missingVar of missingVars) {
    console.warn(`  - ${missingVar}`);
  }
  console.warn('\nПриложение может работать некорректно. При деплое на Netlify убедитесь, что все переменные установлены в настройках проекта.');
  console.warn('См. файл .env.example для примера.\n');
} else {
  console.log('\x1b[32m%s\x1b[0m', '✓ Все необходимые переменные окружения установлены.');
} 
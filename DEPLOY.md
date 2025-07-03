# Инструкции по деплою

## Подготовка к деплою

### 1. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните своими значениями:

```bash
cp .env.example .env
```

### 2. Получение ключей API

#### Firebase
1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Включите Authentication и Firestore
3. Скопируйте конфигурацию из настроек проекта

#### Google API
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте проект или выберите существующий
3. Включите Google Sheets API и Google Drive API
4. Создайте учетные данные (API Key и OAuth 2.0 Client ID)

### 3. Деплой на Netlify

1. Установите переменные окружения в настройках Netlify:
   - Site settings → Environment variables
   - Добавьте все переменные из `.env.example`

2. Настройте build команды:
   ```
   Build command: npm run build
   Publish directory: dist
   ```

### 4. Деплой на других платформах

#### Vercel
```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
# ... добавьте все переменные
```

#### Railway/Render
Добавьте переменные окружения через веб-интерфейс платформы.

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Проверка переменных окружения
npm run check-env

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build
```

## Безопасность

⚠️ **ВАЖНО**: Никогда не коммитьте файлы с реальными ключами API!

- `.env*` файлы исключены в `.gitignore`
- Используйте только плейсхолдеры в `.env.example`
- Для CI/CD используйте secrets платформы 
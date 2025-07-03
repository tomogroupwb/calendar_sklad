# Календарь поставок на маркетплейсы

Веб-приложение для отслеживания поставок на маркетплейсы (Ozon, Wildberries, Яндекс.Маркет) с возможностью фильтрации и просмотра деталей поставок.

## Функциональность

- Отображение поставок в формате календаря (месяц, неделя, список)
- Фильтрация по маркетплейсу, складу и подразделению
- Просмотр деталей поставки при клике на событие
- Интеграция с Google Sheets для получения данных
- Авторизация через Google для ограничения доступа
- Адаптивный дизайн для всех устройств

## Настройка Google Sheets API

Чтобы настроить Google Sheets API для работы с приложением:

1. Зайдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google Sheets API и Google Drive API
4. Создайте учетные данные (API ключ и OAuth 2.0 Client ID)
5. Ограничьте доступ к API ключу и настройте разрешенные домены
6. Добавьте полученные ключи в файл `.env` (смотрите пример в `.env.example`)

## Настройка Firebase

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Добавьте приложение Web в свой проект
3. Скопируйте данные конфигурации Firebase и добавьте их в файл `.env`
4. Включите аутентификацию через Email/Password и Google в разделе Authentication
5. Создайте Firestore базу данных для хранения конфигураций пользователей

## Структура данных

Таблица Google Sheets должна содержать следующие столбцы:
- Дата поставки (формат YYYY-MM-DD)
- Маркетплейс (Ozon, Wildberries, Яндекс.Маркет)
- Склад отгрузки
- Подразделение
- Количество товаров

## Технологии

- React с TypeScript
- Tailwind CSS для стилизации
- FullCalendar для отображения календаря
- Google API для авторизации и получения данных
- Firebase для аутентификации и хранения данных
- Vite для сборки проекта

## Переменные окружения

Создайте файл `.env` в корне проекта со следующими переменными:

```
# Firebase конфигурация
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Google API
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
```

## Инструкция по запуску

```bash
# Установка зависимостей
npm install

# Создайте файл .env и заполните переменные окружения
# См. раздел "Переменные окружения"

# Запуск в режиме разработки
npm run dev

# Сборка для продакшн
npm run build

# Предпросмотр продакшн версии
npm run preview
```

## Деплой на Netlify

### Вариант 1: Через веб-интерфейс

1. Создайте аккаунт на [Netlify](https://www.netlify.com/)
2. Подключите репозиторий с проектом (GitHub, GitLab, Bitbucket)
3. Настройте переменные окружения в настройках проекта (Settings → Build & deploy → Environment):
   - Добавьте все переменные из раздела "Переменные окружения"
4. Произойдет автоматический деплой приложения
5. Для настройки кастомного домена используйте раздел "Domain management"

### Вариант 2: Через командную строку (Netlify CLI)

1. Установите Netlify CLI глобально:
   ```bash
   npm install netlify-cli -g
   ```

2. Авторизуйтесь в Netlify:
   ```bash
   netlify login
   ```

3. Подготовьте сборку проекта:
   ```bash
   # Создайте файл .env с переменными окружения
   # Установите зависимости, если еще не установлены
   npm install
   
   # Соберите проект
   npm run build
   ```

4. Инициализируйте проект Netlify (если это первый деплой):
   ```bash
   netlify init
   ```
   - Выберите "Create & configure a new site"
   - Выберите команду Netlify, к которой относится ваш проект
   - Задайте имя сайта (или оставьте случайно сгенерированное)
   - Подтвердите настройки сборки (команда: `npm run build`, директория публикации: `dist`)

5. Настройте переменные окружения:
   ```bash
   # Добавление всех переменных из .env на Netlify
   netlify env:import .env
   ```

6. Деплой проекта:
   ```bash
   netlify deploy --prod
   ```

7. Для настройки кастомного домена:
   ```bash
   netlify domains:add mydomain.com
   ```

8. Проверьте статус вашего сайта:
   ```bash
   netlify status
   ```

### После деплоя

Важно: обязательно добавьте доменные имена Netlify (включая автоматически сгенерированное имя *.netlify.app) в список разрешенных доменов в Firebase и Google Cloud Console для корректной работы аутентификации и API.
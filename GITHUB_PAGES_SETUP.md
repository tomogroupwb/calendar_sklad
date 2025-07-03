# Настройка GitHub Pages

## 1. Добавь секреты в GitHub

Перейди в [настройки репозитория](https://github.com/tomogroupwb/calendar_sklad/settings/secrets/actions) и добавь следующие секреты:

### Repository secrets (Settings → Secrets and variables → Actions)

| Name | Value |
|------|-------|
| `VITE_FIREBASE_API_KEY` | Твой Firebase API ключ |
| `VITE_FIREBASE_AUTH_DOMAIN` | `твой-проект.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ID твоего Firebase проекта |
| `VITE_FIREBASE_STORAGE_BUCKET` | `твой-проект.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID из Firebase |
| `VITE_FIREBASE_APP_ID` | App ID из Firebase |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `VITE_GOOGLE_SHEETS_API_KEY` | Google Sheets API ключ |

## 2. Включи GitHub Pages

1. Перейди в [Settings → Pages](https://github.com/tomogroupwb/calendar_sklad/settings/pages)
2. В разделе "Source" выбери **"GitHub Actions"**
3. Сохрани настройки

## 3. Автоматический деплой

После push в ветку `main`:
- Автоматически запускается GitHub Actions
- Проект собирается с переменными окружения из секретов
- Результат деплоится на GitHub Pages
- Сайт доступен по адресу: https://tomogroupwb.github.io/calendar_sklad/

## 4. Проверка статуса

- Статус деплоя: [Actions](https://github.com/tomogroupwb/calendar_sklad/actions)
- Логи сборки: кликни на конкретный workflow run

## ⚠️ Важно

1. **Все API ключи храни только в GitHub Secrets** - никогда не коммить их в код
2. Firebase проект должен быть настроен для твоего домена GitHub Pages
3. Google OAuth должен разрешать redirect с домена GitHub Pages

## 🔗 Полезные ссылки

- [GitHub Pages документация](https://docs.github.com/en/pages)
- [GitHub Actions для Pages](https://github.com/actions/deploy-pages)
- [Vite статический деплой](https://vitejs.dev/guide/static-deploy.html#github-pages) 
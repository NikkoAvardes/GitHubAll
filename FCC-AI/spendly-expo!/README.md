# Spendly (Expo) — полный перенос

## Запуск
```bash
npx create-expo-app@latest spendly --template blank
cd spendly
npx expo install react-native-svg react-native-safe-area-context @react-native-async-storage/async-storage \
  expo-document-picker expo-secure-store expo-local-authentication expo-file-system expo-sharing \
  @react-native-community/datetimepicker
```
Замените `App.js`, добавьте папку `src/` и запустите `npx expo start` (откройте QR в Expo Go).

## app.json
```json
{ "expo": { "userInterfaceStyle": "automatic",
  "ios": { "infoPlist": { "NSFaceIDUsageDescription": "Разблокировка Spendly" } } } }
```
(в Expo Go Face ID может не работать; полностью проверяется в development build / EAS Build)

## Что внутри
Главная с диаграммой, ввод в 3 шага (заметка → сумма → категория), история с пакетным переносом/удалением и «Отменить»,
периоды (дни/недели/месяцы/годы + свой «с — по»), поиск с первой буквы, редактор категорий, импорт Monefy CSV,
настройки (тема, RU/EN/FR, валюта, начало недели и месяца), пароль + Face ID (пароль хранится в SecureStore),
экспорт JSON через системное меню «Поделиться», резервная копия в приложении, восстановление из файла,
удаление всех данных в два этапа.

## Дальше
Сборка и публикация: `npm i -g eas-cli`, `eas build -p ios` (нужен аккаунт Apple Developer).
 
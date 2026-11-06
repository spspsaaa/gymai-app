# js/ — модули клиента

Классические скрипты (не `defer`, не `type=module`): все делят одну глобальную область,
поэтому **порядок тегов `<script>` в index.html = порядок выполнения**. Не менять без прогона `node tests/run.js`.

01-core · 02-calendar · 03-exercises-progress · 04-workout-session · 05-plan-editor ·
06-history · 07-tariff · 08-account-auth · 09-coach-chat · 10-telegram-sync · 11-theme  — тестируются
90-storage-sync-hook · 91-pwa · 92-admin  — помечены `data-notest`, стенд их не загружает (как и раньше)

Стенд `tests/run.js` сам читает теги `js/*` из index.html в том же порядке. Новый модуль = новый тег + файл в списке
`addAll` в sw.js + поднять `CACHE` в sw.js.

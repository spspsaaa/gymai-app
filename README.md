# gymai-app
GYM AI mini app frontend: Telegram WebApp UI, workout calendar, plan editor, history, AI coach

## Тесты

Офлайн-стенд для клиента: `node tests/run.js` (только Node, без npm).
Сам поднимает DOM-шим, достаёт разметку и скрипт из `index.html` и гоняет
настоящий код клиента. 61 тест в трёх наборах: `feature`, `regression`,
`sync`.

То же самое запускается в CI: `.github/workflows/tests.yml` гоняет стенд на
каждом пуше в `main`.

Проверка живого бэкенда живёт в соседнем репозитории `gymai-backend`
(`node scripts/smoke.js`).

Подробности и список полезных мутаций — в `HANDOFF.md`.

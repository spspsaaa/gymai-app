# gymai-app
GYM AI mini app frontend: Telegram WebApp UI, workout calendar, plan editor, history, AI coach

## Тесты

Офлайн-стенд для клиента: `node tests/run.js` (только Node, без npm).
Сам поднимает DOM-шим, достаёт разметку и скрипт из `index.html` и гоняет
настоящий код клиента. 54 теста в трёх наборах: `feature`, `regression`,
`sync`.

Подробности и список полезных мутаций — в `HANDOFF.md`.

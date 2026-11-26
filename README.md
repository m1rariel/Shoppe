# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Tests

```bash
npm test                 # сохранённый набор node:test (tests/*.test.js)
npm run test:unit        # весь набор Vitest, однократно
npm run test:unit:watch  # Vitest в режиме разработки
npm run test:unit -- ProductPage
npm run test:unit:related -- components/ProductCard.vue
```

Vitest запускает только `tests/unit/**/*.spec.ts`, используя Vue Test Utils и jsdom.
В тестах отдельных компонентов фикстуры из `tests/fixtures/products.ts` передаются
через props. В интеграционном тесте страницы товара MSW отвечает на HTTP-запросы
товара, похожих товаров и корзины. Тесты выполняются без реального API, а запрос
без обработчика приводит к ошибке. Тестовый адаптер Nuxt передаёт запросы в
`ofetch`, поэтому загрузчики приложения получают HTTP-ответы мок-сервера.

В CI весь Vitest выполняется до сборки и публикации. Перед commit lint-staged
однократно запускает связанные тесты для изменённых исходников и тестов; отсутствие
связанных тестов допустимо, падение найденного теста блокирует commit. При изменении
конфига, setup или зависимостей выполняется весь набор. Аргументы передаются процессу
без shell, включая пути страниц с `[id]`.

## Development Server

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Docker

Контейнер запускает production Nuxt Node SSR на порту 80. Сервер читает cookie
каждого запроса, поэтому вход восстанавливается при перезагрузке, а аккаунт
авторизованного пользователя перенаправляет на главную до отправки страницы.

```bash
docker build -t shoppe .
docker run --rm --name shoppe -p 8080:80 \
  -e NUXT_PUBLIC_API_BASE_URL=https://your-api.example \
  shoppe
docker stop shoppe
```

Адрес API задаётся при запуске и используется сервером и браузером. Он должен
быть доступен из обоих окружений. Приложение доступно по `http://<IP-хоста>:8080`.
Сборке адрес API не нужен: `.env*`, Git и локальные результаты сборки исключены
из Docker context. При запуске переменная `NUXT_PUBLIC_API_BASE_URL` обязательна;
отсутствующее, пустое или состоящее из пробелов значение останавливает контейнер
с понятной ошибкой до запуска сервера. Значение передаётся в Nuxt runtime config,
включая клиентскую конфигурацию, которую сервер отправляет с HTML.

Nginx-конфигурация `nginx.conf` относится к прежнему статическому размещению;
Docker больше её не использует. Nitro сохраняет оригиналы ресурсов и готовит
варианты Gzip/Brotli во время сборки; проверка `nginx -t` к этому образу неприменима.
Отдельный `node compress.js [каталог]` остаётся доступен для сжатия файлов вне
production-сборки. После Nuxt build его не запускают: manifest Nitro уже содержит
размеры и ETag подготовленных вариантов.

Проверки компрессора и чистой Docker-сборки (требуется запущенный Docker):

```bash
node --test tests/compress.test.js
SHOPPE_TEST_HOST=<IP-хоста> node --test tests/docker-runtime.test.mjs
```

Вторая проверка создаёт временный context из текущих файлов Git и новых исходников,
без локальных настроек и артефактов, собирает образ и удаляет свои контейнеры после
проверки. При нестандартном расположении Docker CLI задайте `DOCKER_BIN`.

Браузерная проверка авторизации использует существующую установку Playwright
с Chromium. Runner не устанавливает зависимости или браузеры. Укажите путь к
модулю через `PLAYWRIGHT_MODULE`; если пакет уже доступен проекту, переменную
можно опустить.

```bash
SHOPPE_TEST_HOST=<IP-хоста> \
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
npm run test:auth:browser
```

Runner собирает образ, запускает контейнер на свободном порту и синтетический
HTTP API, выполняет SSR-проверку `tests/auth-runtime.test.mjs`, затем проверяет
форму в Chromium через IP хоста. Покрыты срок cookie и повторная запись одинакового
токена, reload, redirects, выход, восстановление корзины, ошибка входа, отмена и
поздний ответ предыдущего запроса. Проверяется отсутствие ошибок гидратации.
Nuxt, Pinia и store работают без подмены. Для повторного использования готового
образа задайте `SHOPPE_TEST_IMAGE`; такой образ runner не удаляет. Созданные им
контейнер, API и браузер закрываются в `finally`, собственный образ удаляется.
IPv4 можно определить автоматически, но при нескольких сетевых интерфейсах
задайте `SHOPPE_TEST_HOST`, доступный из Docker и браузера.

Этот сценарий подтверждает вход через управляемый API с вымышленными данными.
Он не подтверждает действующие учётные данные внешнего сервера.

Проверка Shop с реальным API на свежем образе:

```bash
docker build -t shoppe-check .
SHOPPE_TEST_IMAGE=shoppe-check \
SHOPPE_TEST_HOST=<IP-хоста> \
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
NUXT_PUBLIC_API_BASE_URL=https://shoppe-api-eleet.msk1.amvera.tech \
node scripts/check-shop-browser.mjs
```

Сценарий проверяет доступ к API из контейнера, SSR-содержимое, прямое открытие,
переход Shop, reload, пагинацию, сортировку и категорию. Он записывает фактические
URL и статусы клиентских запросов, проверяет отсутствие CORS, mixed content и
ошибок гидратации. Отдельный локальный HTTP fixture проверяет сообщение об ошибке
503 и восстановление кнопкой Try again; этот искусственный сбой не выдаётся за
причину исходной проблемы. Созданные контейнеры, fixture API и Chromium закрываются
после проверки, переданный образ сохраняется.

В текущем SSR-контейнере с явно заданным API исходный сбой загрузки Shop не
воспроизведён. Успешная проверка этой конфигурации не устанавливает историческую
причину сбоя прежнего контейнера и не подтверждает вход в реальный API.

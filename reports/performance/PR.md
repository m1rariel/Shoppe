## Summary

Добавлены авторизация и процесс оформления заказа. Production-загрузка главной,
каталога и карточки товара оптимизирована; исправлено исчезновение поиска каталога
при hydration на GitHub Pages.

```diff
 Главная
- исходные полноразмерные изображения, lazy первый слайд, повторный запрос Picsum
+ responsive WebP, eager/high первый слайд, согласованный HTML/payload
 Общие ресурсы
- Google Fonts CSS и PNG About
+ локальные шрифты и WebP About
 Каталог / товар
+ eager видимые изображения, высокий приоритет активного фото
```

## Evidence

Медианы трёх независимых PageSpeed Insights запусков для каждой страницы и устройства.
Кешированные повторы и отчёты неправильных URL с HTTP 404 исключены.

| Страница |                                                                                                                                                                                                             Mobile до → после | Desktop до → после | Mobile LCP до → после |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | -----------------: | --------------------: |
| Главная  |                             [72](https://pagespeed.web.dev/analysis/https-m1rariel-github-io-Shoppe/yhmwbtthmp9c9vioa4x3uh) → [97](https://pagespeed.web.dev/analysis/https-m1rariel-github-io-Shoppe/ygb9t88ezq6i5ciaewdtun) |           85 → 100 |        12,59 → 2,56 с |
| Каталог  |           [93](https://pagespeed.web.dev/analysis/https-m1rariel-github-io-Shoppe-products/u67deeh5r5rixa4ifj1nbu) → [96](https://pagespeed.web.dev/analysis/https-m1rariel-github-io-Shoppe-products/495raxf7mm2n1d5edevar5) |          100 → 100 |         3,17 → 2,86 с |
| Товар    | [95](https://pagespeed.web.dev/analysis/https-m1rariel-github-io-Shoppe-products-3024/r5b1eu0x4xc282cxc2002t) → [98](https://pagespeed.web.dev/analysis/https-m1rariel-github-io-Shoppe-products-3024/ql1hxukv7vfqbd7z73vg4j) |          100 → 100 |         2,86 → 2,40 с |

- **Before:** главная передавала 5,72 МБ, 41 запрос; HTML и payload выбирали разные Picsum pages.
  **After:** 0,38 МБ, 28 запросов; повторного запроса списка нет. Случайные фотографии
  между сборками различаются, поэтому сравнение трафика имеет это ограничение.
- **Before:** Swiper включал неиспользуемый Navigation.
  **After:** −4207 rendered bytes по Nuxt Analyze; все 10 слайдов, loop и pagination сохранены.
- Проверки: 182/182 Node tests, 67/67 Vitest; ESLint, Stylelint, TypeScript,
  Prettier и production generate прошли. Chromium проверен на ширинах 320/390/767/768/1440.
  Галерея, корзина и гостевой checkout проверены с подменой изменяющих запросов;
  полный авторизованный checkout и реальные оплаты не выполнялись.
- [Отчёт, скриншоты, исходные PSI JSON, Nuxt Analyze и Chrome traces](https://github.com/m1rariel/Shoppe/tree/task12/reports/performance).
  [Измеренная версия: 7bb6eb1, успешный deploy](https://github.com/m1rariel/Shoppe/actions/runs/45836066785).

Все страницы достигли Performance 90+, но полное закрытие 80–90% предупреждений
не достигнуто: остаются cache headers GitHub Pages, внешние изображения, critical CSS
и unused Vue/Nuxt JavaScript. Частичные улучшения отдельно зафиксированы в отчёте.

## Merge Danger

**Door:** two-way

Изменения обратимы, миграций данных нет. Слияние в main запускает публикацию GitHub Pages.

**Blast Radius:** storefront

Общие шрифты, первый экран, слайдер и приоритеты изображений затрагивают все страницы.
Проверены Picsum fallback и отсутствие сдвига поиска при завершающем слеше каталога.
